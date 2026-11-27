package expo.modules.senseacutout

import android.content.Context
import android.graphics.Bitmap
import android.net.Uri
import com.google.mlkit.vision.common.InputImage
import com.google.mlkit.vision.segmentation.subject.SubjectSegmentation
import com.google.mlkit.vision.segmentation.subject.SubjectSegmenterOptions
import expo.modules.kotlin.Promise
import expo.modules.kotlin.exception.Exceptions
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition
import java.io.File
import java.io.FileOutputStream
import java.util.UUID

class SenseaCutoutModule : Module() {
  private val context: Context
    get() = appContext.reactContext ?: throw Exceptions.ReactContextLost()

  override fun definition() = ModuleDefinition {
    Name("SenseaCutout")

    Function("isAvailable") { true }

    // Resolves null (never rejects) when nothing can be cut out, e.g. while Google Play services is
    // still downloading the model on first use; the app then falls back to the server.
    AsyncFunction("removeBackground") { uri: String, promise: Promise ->
      val segmenter = SubjectSegmentation.getClient(
        SubjectSegmenterOptions.Builder().enableForegroundBitmap().build()
      )
      try {
        val image = InputImage.fromFilePath(context, Uri.parse(uri))
        segmenter.process(image)
          .addOnSuccessListener { result ->
            try {
              val fg = result.foregroundBitmap
              val cropped = fg?.let { cropToContent(it) }
              promise.resolve(cropped?.let { save(it) })
            } catch (e: Exception) {
              promise.resolve(null)
            } finally {
              segmenter.close()
            }
          }
          .addOnFailureListener {
            segmenter.close()
            promise.resolve(null)
          }
      } catch (e: Exception) {
        segmenter.close()
        promise.resolve(null)
      }
    }
  }

  private fun save(bitmap: Bitmap): String {
    val out = File(context.cacheDir, "cutout-${UUID.randomUUID()}.png")
    FileOutputStream(out).use { bitmap.compress(Bitmap.CompressFormat.PNG, 100, it) }
    return Uri.fromFile(out).toString()
  }

  /** Trim the transparent border so the piece fills its spot on the outfit board. Null if empty. */
  private fun cropToContent(b: Bitmap): Bitmap? {
    val w = b.width
    val h = b.height
    val px = IntArray(w * h)
    b.getPixels(px, 0, w, 0, 0, w, h)
    var left = w
    var top = h
    var right = -1
    var bottom = -1
    for (y in 0 until h) {
      val row = y * w
      for (x in 0 until w) {
        if ((px[row + x] ushr 24) > 16) {
          if (x < left) left = x
          if (x > right) right = x
          if (y < top) top = y
          if (y > bottom) bottom = y
        }
      }
    }
    if (right < left || bottom < top) return null
    return Bitmap.createBitmap(b, left, top, right - left + 1, bottom - top + 1)
  }
}
