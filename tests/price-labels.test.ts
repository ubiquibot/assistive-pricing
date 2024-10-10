import { jest } from "@jest/globals";
import { syncPriceLabelsToConfig } from "../src/handlers/sync-labels-to-config";
import { listLabelsForRepo } from "../src/shared/label";
import { Context } from "../src/types/context";
import { COLLABORATOR_ONLY_DESCRIPTION } from "../src/types/plugin-input";

interface Label {
  name: string;
  description: string | undefined;
}

jest.mock("../src/shared/label", () => ({
  listLabelsForRepo: jest.fn(),
}));

const mockLogger = {
  info: jest.fn(),
  error: jest.fn(),
};

const mockOctokit = {
  rest: {
    issues: {
      updateLabel: jest.fn(),
    },
  },
};

const mockContext: Context = {
  config: {
    labels: {
      time: [],
      priority: [],
    },
    basePriceMultiplier: 1,
    globalConfigUpdate: { excludeRepos: [] },
  },
  logger: mockLogger,
  payload: {
    repository: {
      owner: { login: "owner" },
      name: "repo",
    },
  },
  octokit: mockOctokit,
} as unknown as Context;

describe("syncPriceLabelsToConfig function", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("should update label descriptions based on collaboratorOnly property", async () => {
    const allLabels = [
      {
        name: "Label1",
        description: undefined,
      },
      {
        name: "Label2",
        description: COLLABORATOR_ONLY_DESCRIPTION,
      },
      {
        name: "Label3",
        description: "Some other description",
      },
    ];
    const mockLogger = {
      info: jest.fn(),
      error: jest.fn(),
    };

    const pricingLabels = [
      { name: "Label1", collaboratorOnly: true },
      { name: "Label2", collaboratorOnly: true },
      { name: "Label3", collaboratorOnly: false },
    ];
    const mockContext: Context = {
      config: {
        labels: {
          time: [],
          priority: [],
        },
        basePriceMultiplier: 1,
        globalConfigUpdate: true,
      },
      logger: mockLogger,
      payload: {
        repository: {
          owner: { login: "owner" },
          name: "repo",
        },
      },
      octokit: mockOctokit,
    } as unknown as Context;

    (listLabelsForRepo as unknown as jest.Mock<() => Promise<typeof allLabels>>).mockResolvedValue(allLabels);
    mockContext.config.labels.time = [];
    mockContext.config.labels.priority = [];
    for (const label of pricingLabels) {
      mockContext.config.labels.time.push({ name: label.name, collaboratorOnly: label.collaboratorOnly });
    }

    await syncPriceLabelsToConfig(mockContext);

    expect(mockLogger.info).toHaveBeenCalledWith("Incorrect description labels found, updating them", {
      incorrectDescriptionLabels: ["Label1", "Label3"],
    });

    expect(mockContext.octokit.rest.issues.updateLabel).toHaveBeenCalledWith({
      owner: "owner",
      repo: "repo",
      name: "Label1",
      description: COLLABORATOR_ONLY_DESCRIPTION,
    });

    expect(mockContext.octokit.rest.issues.updateLabel).toHaveBeenCalledWith({
      owner: "owner",
      repo: "repo",
      name: "Label3",
      description: undefined,
    });
  });

  it("should not update labels if descriptions match the collaboratorOnly criteria", async () => {
    const allLabels: Label[] = [
      { name: "Label1", description: COLLABORATOR_ONLY_DESCRIPTION },
      { name: "Label2", description: COLLABORATOR_ONLY_DESCRIPTION },
      { name: "Label3", description: undefined },
    ];

    const pricingLabels = [
      { name: "Label1", collaboratorOnly: true },
      { name: "Label2", collaboratorOnly: true },
      { name: "Label3", collaboratorOnly: false },
    ];

    (listLabelsForRepo as unknown as jest.Mock<() => Promise<typeof allLabels>>).mockResolvedValue(allLabels);

    mockContext.config.labels.time = pricingLabels;
    mockContext.config.labels.priority = [];

    await syncPriceLabelsToConfig(mockContext);

    expect(mockOctokit.rest.issues.updateLabel).not.toHaveBeenCalled();
  });
});
