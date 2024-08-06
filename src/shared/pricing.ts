import { Context } from "../types/context";
import { Label } from "../types/github";

export function calculateTaskPrice(context: Context, timeValue: number, priorityValue: number, baseValue?: number): number {
  const base = baseValue ?? context.config.basePriceMultiplier;
  const priority = priorityValue / 10; // floats cause bad math
  return 1000 * base * timeValue * priority;
}

export function getPrice(context: Context, timeLabel: Label, priorityLabel: Label) {
  const logger = context.logger;
  const { labels } = context.config;

  if (!timeLabel || !priorityLabel) throw logger.error("Time or priority label is not defined");

  const recognizedTimeLabels = labels.time.find((configLabel) => configLabel === timeLabel.name);
  if (!recognizedTimeLabels) throw logger.error("Time label is not recognized");

  const recognizedPriorityLabels = labels.priority.find((configLabel) => configLabel === priorityLabel.name);
  if (!recognizedPriorityLabels) throw logger.error("Priority label is not recognized");

  const timeValue = calculateLabelValue(recognizedTimeLabels);
  if (!timeValue) throw logger.error("Time value is not defined");

  const priorityValue = calculateLabelValue(recognizedPriorityLabels);
  if (!priorityValue) throw logger.error("Priority value is not defined");

  const taskPrice = calculateTaskPrice(context, timeValue, priorityValue);
  return `Price: ${taskPrice} USD`;
}

export function calculateLabelValue(label: string): number {
  const matches = label.match(/\d+/);
  const number = matches && matches.length > 0 ? parseInt(matches[0]) || 0 : 0;
  if (label.toLowerCase().includes("priority")) return number;
  if (label.toLowerCase().includes("minute")) return number * 0.002;
  if (label.toLowerCase().includes("hour")) return number * 0.125;
  if (label.toLowerCase().includes("day")) return 1 + (number - 1) * 0.25;
  if (label.toLowerCase().includes("week")) return number + 1;
  if (label.toLowerCase().includes("month")) return 5 + (number - 1) * 8;
  return 0;
}
