# Best Practice Guide for Creating Well-Formed Records for a Spatio-Temporal Asset Catalogue

This guide provides best practices for ensuring that records in a Spatio-Temporal Asset Catalogue (STAC) are well-formed, consistent, and user-friendly. Following these principles will improve usability, searchability, and interoperability of the catalogue.

---

## 1. General Principles

1. **Consistency**:

   - Use standardized and consistent naming conventions for collections and items.
   - Adhere to controlled vocabularies and common metadata standards (e.g., ISO 19115, CF conventions, or Schema.org).

2. **Discoverability**:

   - Include clear, descriptive metadata for each record to enable users to locate relevant assets quickly.
   - Support various query methods: free-text search, faceted search, and geospatial queries.

3. **Interoperability**:

   - Use widely recognized data and metadata standards (e.g., GeoJSON, JSON-LD, STAC Specification) to ensure compatibility with tools and platforms.

4. **Scalability**:

   - Structure metadata to accommodate future data sources or types without significant rework.

---

## 2. Metadata for Collections

Collections represent groups of related assets and should include the following metadata fields:

### Core Metadata Fields

| Field         | Description                                                                         | Best Practices                                                                     |
| ------------- | ----------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------- |
| `id`          | Unique identifier for the collection.                                               | Use a clear and concise identifier, such as `eo_landsat_8` or `climate_cmip6`.     |
| `title`       | Human-readable name of the collection.                                              | Make it descriptive but concise (e.g., "Landsat 8 Surface Reflectance").           |
| `description` | Detailed description of the collection, including its purpose and scope.            | Include information on data sources, temporal and spatial coverage, and use cases. |
| `license`     | Licensing terms for the collection.                                                 | Use standardized license identifiers (e.g., `CC-BY-4.0`, `proprietary`).           |
| `keywords`    | Keywords relevant to the collection.                                                | Use terms from controlled vocabularies like GCMD Keywords or CF Standard Names.    |
| `providers`   | List of organizations or individuals involved in creating or distributing the data. | Include `name`, `roles` (e.g., producer, processor, distributor), and `url`.       |
| `extent`      | Temporal and spatial extent of the data.                                            | Use ISO 8601 for time and GeoJSON for spatial bounding boxes.                      |
| `links`       | Links to additional resources, documentation, or related collections.               | Ensure URLs are valid and include `rel` types (e.g., `self`, `parent`, `child`).   |

### Optional Fields

| Field       | Description                                                                           | Best Practices                                                       |
| ----------- | ------------------------------------------------------------------------------------- | -------------------------------------------------------------------- |
| `summaries` | Summary statistics or values for specific fields (e.g., temporal range, cloud cover). | Provide aggregated summaries for quick filtering in user interfaces. |
| `version`   | Version number of the collection.                                                     | Use semantic versioning (e.g., `1.0.0`).                             |
| `themes`    | Thematic categories for the collection (e.g., "climate", "forests").                  | Use controlled vocabularies like INSPIRE themes or GEMET concepts.   |

---

## 3. Metadata for Items

Items represent individual assets within a collection. They should include the following fields:

### Core Metadata Fields

| Field        | Description                                                                              | Best Practices                                                                           |
| ------------ | ---------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------- |
| `id`         | Unique identifier for the item.                                                          | Combine collection ID and unique characteristics (e.g., `landsat8_20230101_012345`).     |
| `geometry`   | Geospatial footprint of the asset (in GeoJSON format).                                   | Ensure the geometry is accurate and aligns with the asset's spatial coverage.            |
| `bbox`       | Bounding box for the asset (in [minX, minY, maxX, maxY] format).                         | Derive from the `geometry` field.                                                        |
| `properties` | Key-value pairs describing the asset's properties (e.g., acquisition date, cloud cover). | Include fields like `datetime`, `platform`, and `instrument` for Earth observation data. |
| `assets`     | List of related files (e.g., imagery, metadata, or ancillary data).                      | Provide clear descriptions and media types (e.g., `image/tiff`, `application/json`).     |
| `links`      | Links to related resources or parent collection.                                         | Include `rel` types such as `self`, `collection`, and `related`.                         |

### Recommended Properties for Items

| Property           | Description                                                               | Best Practices                                                              |
| ------------------ | ------------------------------------------------------------------------- | --------------------------------------------------------------------------- |
| `datetime`         | Timestamp of the asset (in ISO 8601 format).                              | Use UTC and include time where applicable.                                  |
| `platform`         | Platform used to collect the data (e.g., satellite, drone).               | Use consistent naming (e.g., `sentinel-2`, `landsat-8`).                    |
| `instrument`       | Instrument used for data collection (e.g., sensor or camera).             | Use consistent naming and controlled vocabularies.                          |
| `cloud_cover`      | Percentage of cloud cover in the asset (if applicable).                   | Use a standardized field name and format (e.g., a value between 0 and 100). |
| `resolution`       | Spatial resolution of the asset.                                          | Specify units (e.g., meters per pixel).                                     |
| `processing_level` | Level of processing applied to the data (e.g., raw, surface reflectance). | Use controlled vocabularies like those from NASA or ESA.                    |
| `quality`          | Quality assessment or flags for the asset.                                | Use standardized metrics or flags (e.g., `good`, `partial`, `bad`).         |

---

## 4. Naming Conventions

1. **Collections**:

   - Use lowercase alphanumeric characters and underscores (`_`).
   - Format: `<domain>_<data type>_<platform>` (e.g., `climate_cmip6`, `eo_landsat8`).

2. **Items**:

   - Combine collection ID with unique identifiers.
   - Format: `<collection ID>_<YYYYMMDD>_<unique ID>` (e.g., `landsat8_20230101_012345`).

3. **Assets**:

   - Use descriptive filenames that include the collection, item ID, and file type.
   - Format: `<collection ID>_<item ID>_<asset type>.tif` (e.g., `landsat8_20230101_012345_rgb.tif`).

---

## 5. Controlled Vocabularies

- Use standardized vocabularies where possible to ensure consistency. Examples:
  - **Keywords**: GCMD Keywords, INSPIRE themes, or GEMET concepts.
  - **Platforms**: CEOS Mission Database.
  - **Instruments**: NASA Instrument Vocabulary.
  - **Processing Levels**: USGS Landsat Processing Levels or ESA Sentinel Levels.

---

## 6. User Interface Considerations

1. **Faceted Search**:

   - Enable filtering by common fields (e.g., `platform`, `datetime`, `keywords`, `spatial extent`).

2. **Geospatial Search**:

   - Support map-based queries with bounding boxes, polygons, or points.

3. **Free-Text Search**:

   - Allow users to search across all metadata fields with fuzzy matching.

4. **Sorting and Ranking**:

   - Provide options to sort results by relevance, date, spatial proximity, or quality.

5. **Visualization**:

   - Display geospatial data on interactive maps.
   - Include previews or quicklooks for assets where possible.

---

## 7. Validation and Quality Control

1. **Schema Validation**:

   - Validate records against the STAC Specification or other relevant schemas.

2. **Automated Checks**:

   - Implement tools to check for missing fields, incorrect formats, or inconsistencies.

3. **Manual Review**:

   - Periodically review metadata for accuracy and relevance.

4. **Feedback Mechanisms**:

   - Allow users to report errors or suggest improvements to metadata.

---

By adhering to these best practices, your Spatio-Temporal Asset Catalogue will be well-structured, user-friendly, and interoperable, meeting the needs of diverse data consumers.
