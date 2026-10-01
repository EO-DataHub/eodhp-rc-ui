# Workflows and saved sets: proposed user experience

This document describes the proposed user experience for three features in the Resource Catalogue UI:

- **Saved sets**: named groups of items, stored in a workspace.
- **Running workflows**: on one item, on many items, or on a whole search.
- **Creating workflows**: upload a CWL file, map its inputs, and publish it.

## Key ideas

### Saved sets

A saved set is a named list of items that belongs to a workspace. Everyone in the workspace can open it, run workflows on it, and read it from Jupyter, QGIS or ArcGIS.

Pinned items stay as they are today: a quick, personal scratchpad in the browser. **Save as set** copies the pinned items into the workspace.

### Hub input types

When an author publishes a workflow, they map each input to one of these Hub input types:

| Hub input type | Where the Hub gets the value | What the workflow receives |
|---|---|---|
| STAC item | The item the user selects | The item's URL |
| STAC items | Pinned items, a saved set or search results | A list of item URLs |
| STAC search | The user's current Data Finder search | A STAC `/search` body (JSON) |
| Area of interest | The area drawn on the map | A GeoJSON geometry |
| Bounding box | The extent of the drawn area | `[minx, miny, maxx, maxy]` |
| Date | The search dates | An RFC 3339 date string |
| Date range | The search dates | Two RFC 3339 date strings |

Inputs that the Hub doesn't fill are **entered by the user**. Their type, choices and defaults come from the CWL file.

### What a workflow can run on

Users choose what to run a workflow on: **this item**, **pinned items**, **a saved set** or **all results** of a search. Authors don't choose this. The Hub works it out from how the inputs are mapped:

| Main data input | This item | Pinned items, saved set, all results |
|---|---|---|
| STAC item | One run | One run per item, grouped as a batch |
| STAC items | One run (if the workflow accepts a single item) | One run that uses all the items together |
| STAC search, or no data input | Not available | All results only. The workflow runs the search itself |

A workflow can also set a minimum number of items. For example, change detection needs at least two.

### Visibility

A workflow is in one of three states:

| State | Who can run it | Where people find it |
|---|---|---|
| Private | Members of the author's workspace | That workspace's workflow lists |
| Public | Any signed-in Hub user who has the link | Only through a share link, not in search |
| Listed | Everyone | The EODH catalogue, and the workflow lists in the Data Finder |

A workflow must be public before it can be listed. Listing needs a one-off review by Hub admins.

## Journey 1: Save and use a set

1. In the Data Finder, pin the items you want.
2. On the **Pinned Items** tab, choose **Save as set**. Give the set a name and, if you like, a description.
3. Open **Workflows → Saved sets** to see all the sets in your workspace, with item counts, datasets, who created each set, and when it was last changed.
4. Click a set to see its items, with thumbnails, datasets and dates. From there you can:
   - **Open on map**: add the items to your pinned items in the Data Finder. You can do this for the whole set, for selected items, or for one item.
   - **Run workflow** on the set.
   - **Remove** items from the set.
   - **Use in Jupyter or QGIS**: shows the pyeodh code and the STAC ItemCollection URL for the set.
   - **Delete** the set. This removes it for everyone in the workspace. The items and any workflow results are not affected.

## Journey 2: Run a workflow

### Where to start

The **Run workflow** action is in four places, and each one opens the same dialog:

- The item details panel, which runs on that item.
- The **Pinned Items** tab, which runs on the pinned items.
- The **Items** results tab, as **Run on results**, which runs on the search results.
- A saved set, which runs on that set.

### Steps

1. **Choose what to run on.** If a choice isn't available, the dialog says why, for example "Pin some items on the map first". **All results** processes at most 25 items. When a search has more, the dialog says that the latest 25 will be used.
2. **Choose a workflow.** The list shows workflows from your workspace and from the EODH catalogue. A workflow that can't run on your choice is greyed out with a plain reason:
   - "This workflow runs its own search. Choose All results."
   - "Needs at least 2 items to compare."
   - "Only works with Sentinel-1 GRD."
3. **Check the inputs.** Inputs filled by the Hub are shown with their values, for example "The area you drew on the map". If the Hub can't fill a required input, the dialog says so and you can't continue, for example "Draw an area on the map before running this workflow". You fill in the remaining inputs, which use the defaults and choices set by the author.
4. **Review and run.** The review shows:
   - the workflow, and what it runs on;
   - the number of jobs;
   - the workspace that gets the results and pays for the run;
   - the estimated cost in credits, and your balance.

   Notes explain anything unexpected. For example, a run on a saved set uses the items in the set as they are now, and later changes to the set don't affect it.
5. **Follow progress.** Choose **View progress** to open **Workflow runs**.

### Track runs

**Workflow runs** shows each run as one card, even when it has many jobs. Each card shows its progress and overall status, such as "Running · 4 of 12 done" or "Finished · 1 failed". Expand a card to see each job. If some jobs fail, **Retry failed** runs only those jobs again.

In the real product, this list would be part of **My data → Workflow outputs**.

## Journey 3: Create and publish a workflow

Start from **Workflows → Create workflow**, or from **Publishing** in the account menu. The flow has five steps.

1. **Upload.** Drag in a CWL file, or choose one. The Hub checks the file straight away and explains any problem in plain words:
   - whether the file is valid CWL;
   - how many inputs it has;
   - any input types that aren't supported yet, such as `File`;
   - container images that aren't pinned by digest. These are allowed for a private workflow, but must be pinned before the workflow can be made public.
2. **Details.** Add a title, description and keywords. Then choose the datasets the workflow works with from the catalogue's list. If you choose none, the workflow works with any dataset.
3. **Inputs.** Each CWL input has a card that shows its name, CWL type and description. For each input, choose **how it is filled**:
   - **Filled by the Hub** with one of the Hub input types, or
   - **Entered by the user**, with a label, help text and default.

   The dropdown shows every option. Options that don't fit the input's CWL type are greyed out with a reason, for example "needs a Directory or string input". The Hub guesses the obvious mappings, such as a `Directory` input to STAC item, or an input named `aoi` to Area of interest. Each guess is marked **Suggested — check**, and you can't continue until you confirm every guess.
4. **Preview.** See exactly what users will see:
   - the launch form, with the Hub-filled inputs marked;
   - which "run on" choices the mapping allows;
   - how the workflow will look in the workflow list.
5. **Publish privately.** The workflow is available to your workspace straight away. A workspace owner or admin can then:
   - switch it to **Public**, which gives a share link. The link opens the Data Finder with the workflow already chosen, so the person only picks the data.
   - request **listing** in the EODH catalogue. Hub admins review the first listing only.

## Rules behind the design

- **Runs happen in the launcher's workspace.** That workspace gets the outputs and pays for the run.
- **Input mapping follows what ADES can deliver.** For `Directory` inputs, ADES downloads the STAC item and all its files before the workflow starts. ADES can't do this for searches, collections or catalogues, so a STAC search can only go into a `string` input. If a workflow only needs a few bands, the author should use a `string` input and fetch just those files.
- **Every result can be traced to its code.** Each job stores a fingerprint of the CWL that produced it.
- **Updates replace the workflow in place.** If a new CWL file changes the inputs, the author goes back through the Inputs step, with earlier choices filled in where the input names match. Hub admins are notified when a listed workflow changes.
- **Permissions:**
  - Any workspace member can create and edit private workflows.
  - Only workspace owners and admins can make a workflow public, request listing, or delete a public workflow.
  - Making a workflow private, unlisting it or deleting it takes effect immediately.

## About the demo

To view the demo:

1. Run the app on the `sets_workflow_demo` branch.
2. Open `#/workflows/saved-sets`, or use the **Workflows** menu in the nav bar.

No login is needed.

What the demo shows:

- Saving pinned items as a set, the saved sets list, and the set detail page.
- Running a workflow from an item, pinned items, search results or a saved set, with compatibility reasons, inputs, review, and simulated batch progress.
- The five-step Create workflow flow. It reads uploaded CWL files, so you can try your own.
- Making a workflow public and opening it from a share link.

What the demo leaves out:

- The Hub admin review queue.
- A **My workflows** management page.
- Real job submission, real credit costs, and real storage of sets.
- Real items in the two example sets, so **Open on map** shows a notice for those. Sets you save from the map open normally.

Demo data is stored in the browser. **Reset demo data** on the Saved sets page restores the example data.

## Open questions

- Should the limit for **All results** be fixed at 25, or set per workflow?
- Should an author be able to test-run a workflow before publishing, or is publishing privately enough?
- Where should notifications appear, such as review outcomes and alerts about updated workflows?
- Can the Hub estimate the credit cost of a workflow run before it starts?
