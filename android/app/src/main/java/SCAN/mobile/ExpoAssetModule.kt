package SCAN.mobile

import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.WritableMap
import com.facebook.react.bridge.Arguments
import android.util.Log

class ExpoAssetModule(reactContext: ReactApplicationContext) : ReactContextBaseJavaModule(reactContext) {

    companion object {
        private const val TAG = "ExpoAssetModule"
    }

    override fun getName(): String {
        return "ExpoAsset"
    }

    @ReactMethod
    fun downloadAsync(uri: String, promise: Promise) {
        Log.d(TAG, "downloadAsync called with uri: $uri")
        try {
            // Pour l'instant, on retourne l'URI tel quel
            // Dans une vraie implémentation, on téléchargerait le fichier
            val result = Arguments.createMap()
            result.putString("uri", uri)
            result.putString("localUri", uri)
            result.putBoolean("downloaded", true)
            promise.resolve(result)
        } catch (e: Exception) {
            Log.e(TAG, "Error in downloadAsync", e)
            promise.reject("DOWNLOAD_ERROR", e.message)
        }
    }

    @ReactMethod
    fun loadAsync(uri: String, promise: Promise) {
        Log.d(TAG, "loadAsync called with uri: $uri")
        try {
            // Pour l'instant, on retourne l'URI tel quel
            val result = Arguments.createMap()
            result.putString("uri", uri)
            result.putString("localUri", uri)
            result.putBoolean("loaded", true)
            promise.resolve(result)
        } catch (e: Exception) {
            Log.e(TAG, "Error in loadAsync", e)
            promise.reject("LOAD_ERROR", e.message)
        }
    }

    @ReactMethod
    fun fromModule(moduleId: Int, promise: Promise) {
        Log.d(TAG, "fromModule called with moduleId: $moduleId")
        try {
            val result = Arguments.createMap()
            result.putString("uri", "module://$moduleId")
            result.putString("localUri", "module://$moduleId")
            result.putInt("moduleId", moduleId)
            promise.resolve(result)
        } catch (e: Exception) {
            Log.e(TAG, "Error in fromModule", e)
            promise.reject("FROM_MODULE_ERROR", e.message)
        }
    }

    @ReactMethod
    fun fromURI(uri: String, promise: Promise) {
        Log.d(TAG, "fromURI called with uri: $uri")
        try {
            val result = Arguments.createMap()
            result.putString("uri", uri)
            result.putString("localUri", uri)
            promise.resolve(result)
        } catch (e: Exception) {
            Log.e(TAG, "Error in fromURI", e)
            promise.reject("FROM_URI_ERROR", e.message)
        }
    }

    @ReactMethod
    fun fromBundle(bundleName: String, promise: Promise) {
        Log.d(TAG, "fromBundle called with bundleName: $bundleName")
        try {
            val result = Arguments.createMap()
            result.putString("uri", "bundle://$bundleName")
            result.putString("localUri", "bundle://$bundleName")
            result.putString("bundleName", bundleName)
            promise.resolve(result)
        } catch (e: Exception) {
            Log.e(TAG, "Error in fromBundle", e)
            promise.reject("FROM_BUNDLE_ERROR", e.message)
        }
    }
}
