import {
  removeKeys,
  updateDependencies,
  updatePackageManifest,
} from "../src/manifest";
import profile_0_63 from "../src/profiles/profile-0.63";
import profile_0_64 from "../src/profiles/profile-0.64";

const mockDependencies = {
  typescript: "0.0.0",
  react: "0.0.0",
  "react-native-test-app": "0.0.0",
  "react-native": "0.0.0",
};

describe("removeKeys()", () => {
  test("returns a new copy of object with specified keys removed", () => {
    const original = { x: "1", y: "2", z: "3" };
    const originalKeys = Object.keys(original);
    const modified = removeKeys(original, ["x", "z"]);
    expect(modified).not.toBe(original);
    expect(Object.keys(original)).toEqual(originalKeys);
    expect(modified).toEqual({ y: original.y });
  });

  test("returns a new copy of object even if no keys are removed", () => {
    const original = { x: "1", y: "2", z: "3" };
    const originalKeys = Object.keys(original);
    const modified = removeKeys(original, ["a", "b"]);
    expect(modified).not.toBe(original);
    expect(Object.keys(original)).toEqual(originalKeys);
    expect(modified).toEqual(original);
  });

  test("handles undefined objects", () => {
    expect(removeKeys(undefined, ["x", "y"])).toBeUndefined();
  });
});

describe("updateDependencies()", () => {
  const resolvedPackages = {
    react: [profile_0_63["react"], profile_0_64["react"]],
    "react-native": [profile_0_63["core-ios"], profile_0_64["core-ios"]],
    "react-native-macos": [
      profile_0_63["core-macos"],
      profile_0_64["core-macos"],
    ],
    "react-native-test-app": [profile_0_64["test-app"]],
    "react-native-windows": [
      profile_0_63["core-windows"],
      profile_0_64["core-windows"],
    ],
  };

  test("bumps dependencies to maximum supported version", () => {
    const updated = updateDependencies(
      mockDependencies,
      resolvedPackages,
      "direct"
    );
    expect(updated).toEqual({
      react: profile_0_64["react"].version,
      "react-native": profile_0_64["core-ios"].version,
      "react-native-macos": profile_0_64["core-macos"].version,
      "react-native-test-app": "0.0.0",
      "react-native-windows": profile_0_64["core-windows"].version,
      typescript: "0.0.0",
    });
  });

  test("bumps dependencies to minimum supported version", () => {
    const updated = updateDependencies(
      mockDependencies,
      resolvedPackages,
      "development"
    );
    expect(updated).toEqual({
      react: profile_0_63["react"].version,
      "react-native": profile_0_63["core-ios"].version,
      "react-native-macos": profile_0_63["core-macos"].version,
      "react-native-test-app": profile_0_63["test-app"].version,
      "react-native-windows": profile_0_63["core-windows"].version,
      typescript: "0.0.0",
    });
  });

  test("bumps dependencies to widest possible version range", () => {
    const updated = updateDependencies(
      mockDependencies,
      resolvedPackages,
      "peer"
    );
    expect(updated).toEqual({
      react: `${profile_0_63["react"].version} || ${profile_0_64["react"].version}`,
      "react-native": `${profile_0_63["core-ios"].version} || ${profile_0_64["core-ios"].version}`,
      "react-native-macos": `${profile_0_63["core-macos"].version} || ${profile_0_64["core-macos"].version}`,
      "react-native-test-app": "0.0.0",
      "react-native-windows": `${profile_0_63["core-windows"].version} || ${profile_0_64["core-windows"].version}`,
      typescript: "0.0.0",
    });
  });

  test("sorts keys", () => {
    const updated = updateDependencies(
      mockDependencies,
      resolvedPackages,
      "development"
    );
    const updatedKeys = Object.keys(updated);
    const originalKeys = Object.keys(mockDependencies);
    expect(updatedKeys).not.toEqual(originalKeys);
    expect(updatedKeys.sort()).not.toEqual(originalKeys);
  });

  test("bumps dependencies to maximum supported version (Node <=10)", () => {
    const updated = updateDependencies(
      mockDependencies,
      resolvedPackages,
      "direct",
      "10.24.1"
    );
    expect(updated).toEqual({
      react: profile_0_64["react"].version,
      "react-native": profile_0_64["core-ios"].version,
      "react-native-macos": profile_0_64["core-macos"].version,
      "react-native-test-app": "0.0.0",
      "react-native-windows": profile_0_64["core-windows"].version,
      typescript: "0.0.0",
    });
  });

  test("bumps dependencies to minimum supported version (Node <=10)", () => {
    const updated = updateDependencies(
      mockDependencies,
      resolvedPackages,
      "development",
      "10.24.1"
    );
    expect(updated).toEqual({
      react: profile_0_63["react"].version,
      "react-native": profile_0_63["core-ios"].version,
      "react-native-macos": profile_0_63["core-macos"].version,
      "react-native-test-app": profile_0_63["test-app"].version,
      "react-native-windows": profile_0_63["core-windows"].version,
      typescript: "0.0.0",
    });
  });

  test("bumps dependencies to widest possible version range (Node <=10)", () => {
    const updated = updateDependencies(
      mockDependencies,
      resolvedPackages,
      "peer",
      "10.24.1"
    );
    expect(updated).toEqual({
      react: `${profile_0_63["react"].version} || ${profile_0_64["react"].version}`,
      "react-native": `${profile_0_63["core-ios"].version} || ${profile_0_64["core-ios"].version}`,
      "react-native-macos": `${profile_0_63["core-macos"].version} || ${profile_0_64["core-macos"].version}`,
      "react-native-test-app": "0.0.0",
      "react-native-windows": `${profile_0_63["core-windows"].version} || ${profile_0_64["core-windows"].version}`,
      typescript: "0.0.0",
    });
  });

  test("sorts keys (Node <=10)", () => {
    const updated = updateDependencies(
      mockDependencies,
      resolvedPackages,
      "development",
      "10.24.1"
    );
    const updatedKeys = Object.keys(updated);
    const originalKeys = Object.keys(mockDependencies);
    expect(updatedKeys).not.toEqual(originalKeys);
    expect(updatedKeys.sort()).not.toEqual(originalKeys);
  });

  test("sets undefined dependencies", () => {
    expect(
      updateDependencies(undefined, resolvedPackages, "development")
    ).toEqual({
      react: "16.13.1",
      "react-native": "^0.63.4",
      "react-native-macos": "^0.63.0",
      "react-native-test-app": "^0.5.5",
      "react-native-windows": "^0.63.0",
    });
  });
});

describe("updatePackageManifest()", () => {
  test("sets direct dependencies for apps", () => {
    const {
      dependencies,
      devDependencies,
      peerDependencies,
    } = updatePackageManifest(
      {
        name: "Test",
        version: "0.0.1",
        dependencies: mockDependencies,
        peerDependencies: {},
        devDependencies: {},
      },
      ["core-android", "core-ios"],
      [profile_0_63, profile_0_64],
      [profile_0_64],
      "app"
    );
    expect(dependencies).toEqual({
      ...mockDependencies,
      "react-native": profile_0_64["core-ios"].version,
    });
    expect(peerDependencies).toEqual({});
    expect(devDependencies).toEqual({});
  });

  test("removes dependencies from devDependencies for apps", () => {
    const {
      dependencies,
      devDependencies,
      peerDependencies,
    } = updatePackageManifest(
      {
        name: "Test",
        version: "0.0.1",
        dependencies: {},
        peerDependencies: {},
        devDependencies: mockDependencies,
      },
      ["core-android", "core-ios", "react"],
      [profile_0_63, profile_0_64],
      [profile_0_64],
      "app"
    );
    expect(dependencies).toEqual({
      react: profile_0_64["react"].version,
      "react-native": profile_0_64["core-ios"].version,
    });
    expect(peerDependencies).toEqual({});
    expect(devDependencies).toEqual({
      "react-native-test-app": "0.0.0",
      typescript: "0.0.0",
    });
  });

  test("removes dependencies from peerDependencies for apps", () => {
    const {
      dependencies,
      devDependencies,
      peerDependencies,
    } = updatePackageManifest(
      {
        name: "Test",
        version: "0.0.1",
        dependencies: {},
        peerDependencies: mockDependencies,
        devDependencies: {},
      },
      ["core-android", "core-ios", "react"],
      [profile_0_63, profile_0_64],
      [profile_0_64],
      "app"
    );
    expect(dependencies).toEqual({
      react: profile_0_64["react"].version,
      "react-native": profile_0_64["core-ios"].version,
    });
    expect(peerDependencies).toEqual({
      "react-native-test-app": "0.0.0",
      typescript: "0.0.0",
    });
    expect(devDependencies).toEqual({});
  });

  test("sets dev/peer dependencies for libraries", () => {
    const {
      dependencies,
      devDependencies,
      peerDependencies,
    } = updatePackageManifest(
      {
        name: "Test",
        version: "0.0.1",
        dependencies: { "@rnx-kit/dep-check": "^1.0.0" },
        peerDependencies: mockDependencies,
      },
      ["core-android", "core-ios"],
      [profile_0_63, profile_0_64],
      [profile_0_64],
      "library"
    );
    expect(dependencies).toEqual({ "@rnx-kit/dep-check": "^1.0.0" });
    expect(peerDependencies).toEqual({
      ...mockDependencies,
      "react-native": [
        profile_0_63["core-ios"].version,
        profile_0_64["core-ios"].version,
      ].join(" || "),
    });
    expect(devDependencies).toEqual({
      "react-native": profile_0_64["core-ios"].version,
    });
  });

  test("removes dependencies from direct dependencies for libraries", () => {
    const {
      dependencies,
      devDependencies,
      peerDependencies,
    } = updatePackageManifest(
      {
        name: "Test",
        version: "0.0.1",
        dependencies: {
          "@rnx-kit/dep-check": "^1.0.0",
          "react-native": "0.0.0",
        },
        peerDependencies: mockDependencies,
        devDependencies: {},
      },
      ["core-android", "core-ios"],
      [profile_0_64],
      [profile_0_64],
      "library"
    );
    expect(dependencies).toEqual({ "@rnx-kit/dep-check": "^1.0.0" });
    expect(peerDependencies).toEqual({
      ...mockDependencies,
      "react-native": profile_0_64["core-ios"].version,
    });
    expect(devDependencies).toEqual({
      "react-native": profile_0_64["core-ios"].version,
    });
  });
});
