package fit.vertice.restcountdown

import android.annotation.SuppressLint
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.content.Context
import androidx.core.app.NotificationCompat
import androidx.core.app.NotificationManagerCompat
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition

private const val CHANNEL_ID = "rest-countdown"
private const val NOTIFICATION_ID = 7301

/**
 * The running rest on the lock screen: an ongoing notification whose chronometer the system counts
 * down by itself, and that removes itself when the rest ends. Its channel is silent: the rest's end
 * is announced by the scheduled notification on the `rest-timer` channel.
 */
class RestCountdownModule : Module() {
  private val context: Context
    get() = requireNotNull(appContext.reactContext)

  override fun definition() = ModuleDefinition {
    Name("RestCountdown")

    Function("show") { endsAt: Double, title: String, text: String ->
      show(endsAt.toLong(), title, text)
    }

    Function("hide") {
      NotificationManagerCompat.from(context).cancel(NOTIFICATION_ID)
    }
  }

  // The check is `areNotificationsEnabled`, which the lint can't see as the permission check.
  @SuppressLint("MissingPermission")
  private fun show(endsAt: Long, title: String, text: String) {
    val manager = NotificationManagerCompat.from(context)
    val remaining = endsAt - System.currentTimeMillis()
    if (!manager.areNotificationsEnabled() || remaining <= 0) return

    manager.createNotificationChannel(
      NotificationChannel(CHANNEL_ID, "Contagem do descanso", NotificationManager.IMPORTANCE_LOW).apply {
        setSound(null, null)
        enableVibration(false)
        lockscreenVisibility = NotificationCompat.VISIBILITY_PUBLIC
      },
    )
    val launch = context.packageManager.getLaunchIntentForPackage(context.packageName)
    val builder = NotificationCompat.Builder(context, CHANNEL_ID)
      .setSmallIcon(context.applicationInfo.icon)
      .setContentTitle(title)
      .setContentText(text)
      .setWhen(endsAt)
      .setShowWhen(true)
      .setUsesChronometer(true)
      .setChronometerCountDown(true)
      .setOngoing(true)
      .setOnlyAlertOnce(true)
      .setSilent(true)
      .setTimeoutAfter(remaining)
      .setVisibility(NotificationCompat.VISIBILITY_PUBLIC)
    if (launch != null) {
      builder.setContentIntent(
        PendingIntent.getActivity(context, 0, launch, PendingIntent.FLAG_IMMUTABLE or PendingIntent.FLAG_UPDATE_CURRENT),
      )
    }
    manager.notify(NOTIFICATION_ID, builder.build())
  }
}
