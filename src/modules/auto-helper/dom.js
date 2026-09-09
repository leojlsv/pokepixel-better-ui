import { autoHelperConfig as config } from "./config.js";
export function helperParts(root) {
  const q = config.selectors, body = root?.querySelector(q.body), grid = body?.querySelector(q.grid);
  const sections = grid ? [...grid.querySelectorAll(q.section)] : [];
  const [support, normal, shiny, sell] = sections;
  const filter = sections.find(section => section.querySelector(q.names));
  const extract = sections.length === 6 ? sections[4] : null;
  const checks = section => [...(section?.querySelectorAll(q.check) || [])];
  if (!body || !grid || !support || !normal || !shiny || !sell || !filter) return null;
  const parts = { body, grid, sections, support, normal, shiny, sell, extract, filter,
    potion: checks(support)[0], revive: checks(support)[1], hp: support.querySelector(q.select),
    common: checks(normal)[0], shinyCheck: checks(shiny)[0], sellCheck: checks(sell)[0], extractCheck: checks(extract)[0],
    names: filter.querySelector(q.names), status: [...body.querySelectorAll(q.status)].at(-1),
    warnings: [...body.querySelectorAll(q.status)].slice(0, -1),
    sellQualities: [...sell.querySelectorAll(q.quality)], extractQualities: [...(extract?.querySelectorAll(q.quality) || [])],
    sellHeading: sell.querySelector(q.heading), extractHeading: extract?.querySelector(q.heading),
    sellNotes: [...sell.querySelectorAll(q.notes)], extractNotes: [...(extract?.querySelectorAll(q.notes) || [])],
    licenseTime: sell.querySelector(q.time),
    sellGrid: sell.querySelector(q.qualityGrid), extractGrid: extract?.querySelector(q.qualityGrid),
    pickers: [...support.querySelectorAll(q.picker), ...normal.querySelectorAll(q.picker), ...shiny.querySelectorAll(q.picker)],
    locks: [...body.querySelectorAll(q.lock)],
  };
  return [parts.potion, parts.revive, parts.hp, parts.common, parts.shinyCheck, parts.sellCheck, parts.names, parts.status].every(Boolean) && parts.pickers.length === 4 ? parts : null;
}
