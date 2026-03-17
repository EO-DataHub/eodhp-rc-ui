import csv
import sys
from dataclasses import dataclass
import json
import logging
from multiprocessing import Pool

import xarray as xr
from pystac import Item
from pystac_client import Client
from fsspec.implementations.reference import ReferenceNotReachable

from utils import nice_min_max

logger = logging.getLogger("cmip6-kerchunk")
logger.setLevel(logging.INFO)

console_handler = logging.StreamHandler()
file_handler = logging.FileHandler("kerchunk.log")

formatter = logging.Formatter('%(asctime)s %(name)-12s:%(levelname)s:%(message)s')

console_handler.setFormatter(formatter)
file_handler.setFormatter(formatter)

logger.addHandler(console_handler)
logger.addHandler(file_handler)

options = {
    # "target_options": {
    #     "timeout": 60
    # }
}


@dataclass()
class PropertyNames:
    long_name: str
    variable: str
    variable_units: str
    frequency: str
    experiment_id: str
    start_datetime: str
    end_datetime: str


property_names: dict[str, PropertyNames] = {
    "cmip6": PropertyNames("cmip6:variable_long_name", "cmip6:variable_id", "cmip6:variable_units", "cmip6:frequency",
                           "cmip6:experiment_id", "start_datetime", "end_datetime"),
    "cordex": PropertyNames("variable_long_name", "variable_id", "variable_units", "time_frequency", "experiment",
                            "start_datetime", "end_datetime"),
}

extra_variables: dict[str, dict] = {
    "cmip6": {
        "eodhrc:time-variable-items": True,
        "eodhrc:render-key-properties": [
            property_names["cmip6"].variable,
            property_names["cmip6"].frequency,
            property_names["cmip6"].experiment_id
        ],
    },

    "cordex": {
        "eodhrc:time-variable-items": True,
        "eodhrc:render-key-properties": [
            property_names["cordex"].variable,
            property_names["cordex"].frequency,
            property_names["cordex"].experiment_id
        ],
    }
}


def process(item: Item):
    property_set = property_names[item.collection_id]

    variable = item.properties[property_set.variable]
    frequency = item.properties[property_set.frequency]
    experiment_id = item.properties[property_set.experiment_id]
    start_datetime = item.properties[property_set.start_datetime]
    end_datetime = item.properties[property_set.end_datetime]

    props = [variable, frequency, experiment_id, start_datetime, end_datetime, item.id]

    if "reference_file" not in item.assets:
        logger.error(f"Missing reference_file asset {variable} {frequency} {item.id}")
        return

    render_id = "--".join(props[:-3])

    href = item.assets["reference_file"].href
    all_props = ", ".join(props)
    logger.info(f"URL: {href} props: ({all_props})")

    try:
        # Because we have dates that are out of range of 64 bit nanoseconds, we get a warning.
        # We suppress that with the use_cftime=True parameter. This should be fine as we're
        # dealing with years rather than nanoseconds.

        ds = xr.open_dataset(href, engine="kerchunk", use_cftime=True, storage_options=options)
        da = ds[variable]
        vmin_start, vmax_start = map(float, da.isel(time=0).quantile((0.02, 0.98)))
        vmin_end, vmax_end = map(float, da.isel(time=-1).quantile((0.02, 0.98)))

        vmin = min(vmin_start, vmin_end)
        vmax = max(vmax_start, vmax_end)
        ds.close()
    except FileNotFoundError as err:
        logger.error(f"FileNotFoundError: {err} URL: {href}")
        return
    except ReferenceNotReachable as err:
        logger.error(f"ReferenceNotReachable: {err} URL: {href}")
        return
    except Exception as err:
        logger.error(f"Unhandled error: {err} URL: {href}")
        return
    finally:
        ds = None  # noqa

    with open(f"{item.collection_id}_valid.csv", "a") as f:
        writer = csv.writer(f)
        writer.writerow(props)

    with open(f"{item.collection_id}_renders.txt", "a") as f:
        render = {
            "title": item.properties[property_set.long_name].strip() + " (" + item.properties[
                property_set.variable_units].strip() + ")",
            "assets": ["reference_file"],
            "variable": variable,
            "colormap_name": "viridis",
            "rescale": [[vmin, vmax]],
            "reference": True
        }
        j = json.dumps(render)
        f.write(f"{render_id},{j}\n")


def main(collection_id: str):
    # Fetch every item in the catalog and generate render configurations for them.
    catalog = Client.open("https://api.stac.ceda.ac.uk/")

    collection = catalog.get_collection(collection_id)

    with Pool(10, maxtasksperchild=1) as pool:
        pool.map(process, collection.get_items(), chunksize=1)

    # Remove duplicates and ensure the range of values covers each duplicate.
    renders = {}

    with open(f"{collection_id}_renders.txt", "r") as f:
        r = f.readlines()

    render_list = [x.strip().split(",", maxsplit=1) for x in r]

    for render_id, renderer in render_list:
        if render_id is None:
            continue

        renderer = json.loads(renderer)

        if render_id not in renders:
            renders[render_id] = renderer
        else:
            renders[render_id]["rescale"][0][0] = min(renderer["rescale"][0][0], renders[render_id]["rescale"][0][0])
            renders[render_id]["rescale"][0][1] = max(renderer["rescale"][0][1], renders[render_id]["rescale"][0][1])

    # Expand the ranges to be "nice" for rendering as a scale bar.
    for _, renderer in renders.items():
        dmin = renderer["rescale"][0][0]
        dmax = renderer["rescale"][0][1]
        vmin, vmax = nice_min_max(dmin, dmax)
        renderer["rescale"][0][0] = vmin
        renderer["rescale"][0][1] = vmax

    config = {
        collection_id: extra_variables[collection_id]
    }
    config[collection_id]["renders"] = renders

    # Write out the render configurations.
    with open(f"{collection_id}_renders.json", "w") as f:
        json.dump(config, f, indent=2)

    # For sanity checking, write a simple CSV of the components of each render configuration.
    keys = [k.split('--') for k in renders.keys()]
    with open(f"{collection_id}_renders.csv", "w") as f:
        writer = csv.writer(f)
        writer.writerows(keys)


if __name__ == "__main__":
    # Must be one of "cmip6" or "cordex"
    main(sys.argv[1])
