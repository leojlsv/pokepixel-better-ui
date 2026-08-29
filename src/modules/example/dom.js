import { exampleConfig } from "./config.js";

export function findExampleRoot() {
  return document.querySelector(exampleConfig.rootSelector);
}

export function findOwnedExampleNode() {
  return document.querySelector(exampleConfig.ownershipSelector);
}
