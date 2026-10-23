import ExpoModulesCore

/**
 The workout outbox and the session kept on the device (`expo-sqlite/kv-store`, client workout
 spec §3.4) live in `Documents/SQLite`, which iOS puts in iCloud device backups. They can hold
 feedback text (possibly health data, LGPD), and "Sair" can't reach a backup, so the directory is
 marked excluded from backup at every launch, before any database opens. Android has
 `allowBackup: false` in app.json for the same reason.
 */
public class BackupExclusionAppDelegateSubscriber: ExpoAppDelegateSubscriber {
  public func application(
    _ application: UIApplication,
    didFinishLaunchingWithOptions launchOptions: [UIApplication.LaunchOptionsKey: Any]? = nil
  ) -> Bool {
    guard var directory = FileManager.default.urls(for: .documentDirectory, in: .userDomainMask).first?
      .appendingPathComponent("SQLite", isDirectory: true) else {
      return true
    }
    // Created here when missing, so the flag is set before expo-sqlite makes its first file.
    try? FileManager.default.createDirectory(at: directory, withIntermediateDirectories: true)
    var values = URLResourceValues()
    values.isExcludedFromBackup = true
    try? directory.setResourceValues(values)
    return true
  }
}
