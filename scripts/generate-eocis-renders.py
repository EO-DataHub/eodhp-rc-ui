import json
import math

from fsspec.implementations.reference import ReferenceNotReachable
from pystac import Collection
from pystac_client import Client
import requests
import xarray as xr

from utils import nice_min_max


def process(collection: Collection) -> dict:
    renders = {collection.id: {"renders": {}}}

    # Why are we only getting the first Item in the Collection?
    item = next(iter(collection.get_items()))
    if not "reference_file" in item.assets:
        return renders

    asset_url = item.assets["reference_file"].href

    variables_url = f"https://staging.eodatahub.org.uk/titiler/xarray/variables?url={asset_url}"
    response = requests.get(variables_url)
    response.raise_for_status()
    variables = response.json()
    ds = None

    try:
        ds = xr.open_dataset(asset_url, decode_timedelta=True, engine="kerchunk")

        for variable in variables:
            da = None
            if ds is not None:
                da = ds[variable]

            if variable == "dtime":
                continue

            info_url = f"https://staging.eodatahub.org.uk/titiler/xarray/info?url={asset_url}&variable={variable}"
            response = requests.get(info_url)

            if response.status_code != 200:
                print(f"Info retrieval failed for {variable}")
                continue

            response.raise_for_status()
            info = response.json()
            print(variable)
            print(info["attrs"]["long_name"])

            # color map heuristics
            colormap_name = "viridis"
            long_name = info["attrs"]["long_name"]
            if "uncertainty" in long_name.lower() or "uncertainty" in variable.lower():
                colormap_name = "reds"
            elif any(
                    s in long_name.lower() or s in variable.lower() for s in ["std", "standard deviation", "sdev"]):
                colormap_name = "blues"
            elif "sst" in long_name.lower() or "sst" in variable.lower():
                colormap_name = "turbo"
            elif "lst" in long_name.lower() or "lst" in variable.lower():
                colormap_name = "turbo"
            elif "sea ice" in long_name.lower() or "sea ice" in variable.lower():
                colormap_name = "blues_r"

            # title optionally with units
            title = long_name.capitalize()
            if "units" in info["attrs"]:
                units = info["attrs"]["units"]
                if units.lower() == "kelvin":
                    units = "K"
                if units.lower() not in ["1"]:
                    title += f" ({units})"
                for postfix in ["min", "max", "std"]:
                    if variable.lower().endswith(f"_{postfix}") and postfix not in title.lower():
                        prefix = {
                            "min": "Minimum ",
                            "max": "Maximum ",
                            "std": "Std.dev. of "
                        }[postfix]
                        title = prefix + title

            variable_render = {
                "title": title,
                "assets": ["reference_file"],
                "colormap_name": colormap_name,
                "variable": variable,
                "reference": True
            }

            # rescale range
            if "actual_range" in info["attrs"]:
                variable_render["rescale"] = [[
                    math.floor(info["attrs"]["actual_range"][0]),
                    math.ceil(info["attrs"]["actual_range"][1])
                ]]
            elif da is not None and da.size < 1e9:
                try:
                    dmin, dmax = map(float, da.quantile((0.05, 0.95)).values)
                    vmin, vmax = nice_min_max(dmin, dmax)
                    variable_render["rescale"] = [[vmin, vmax]]
                except ReferenceNotReachable:
                    print(f"WARNING: Unable to load data from {asset_url}. Omitting rescale ranges.")
            else:
                print(f"WARNING: Unable to determine rescale range for {variable} of size {da.size}.")

            # append to collection of renders
            renders[collection.id]["renders"][variable] = variable_render
    except ReferenceNotReachable:
        print(f"WARNING: Unable to open {asset_url}")
    finally:
        if ds is not None:
            ds.close()

    return renders


def main():
    # Fetch every item in the catalog and generate render configurations for them.
    catalog = Client.open("https://api.stac.ceda.ac.uk/")

    # There are a number of Collections under the EOCIS name,
    # but for configuration generation purposes we lump them all together.
    collection_id = "eocis"

    collections = (c for c in catalog.get_collections() if c.id.lower().startswith(collection_id))
    config = {}

    for collection in collections:
        config.update(process(collection))

    # Write out the render configurations.
    with open(f"{collection_id}_renders.json", "w") as f:
        json.dump(config, f, indent=2)


if __name__ == "__main__":
    main()
