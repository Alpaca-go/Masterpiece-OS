export function createSettingsOperations(settingsAdapter) {
  return Object.freeze({
    'settings:get': () => settingsAdapter.get(),
    'settings:save': (_context, input) => settingsAdapter.save(input),
    'settings:save-profile': (_context, input) => settingsAdapter.saveProfile(input),
    'settings:delete-profile': (_context, profileId) => settingsAdapter.deleteProfile(profileId),
    'settings:set-default-profile': (_context, profileId) => settingsAdapter.setDefaultProfile(profileId),
    'settings:set-profile-enabled': (_context, profileId, enabled) => settingsAdapter.setProfileEnabled(profileId, enabled),
    'settings:test-profile': (_context, input) => settingsAdapter.testProfile(input),
  });
}

export function createReportOperations({ reports }) {
  return Object.freeze({
    'report:read': (_context, projectId) => reports.read(projectId),
    'report:rename': (_context, projectId, requestedFilename) => reports.rename(projectId, requestedFilename),
  });
}
