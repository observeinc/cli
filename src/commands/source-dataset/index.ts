import { defineRoutes } from "../../lib/stricli-wrappers";
import { listCommand } from "./list";
import { viewCommand } from "./view";
import { createCommand } from "./create";
import { updateCommand } from "./update";
import { deleteCommand } from "./delete";

export const sourceDatasetRoutes = defineRoutes({
  routes: {
    list: listCommand,
    view: viewCommand,
    create: createCommand,
    update: updateCommand,
    delete: deleteCommand,
  },
  docs: {
    brief: "Manage source datasets",
    fullDescription: [
      "Create, view, update and delete source datasets: the datasets that ingested",
      "data lands in, as opposed to datasets built from other datasets.",
      "",
      "Source datasets also show up in 'observe dataset list'. Each one is fed by a",
      "datastream, which 'observe source-dataset create' creates with it; use",
      "'observe datastream' to work with datastreams directly.",
    ].join("\n"),
  },
});
