package SCAN.mobile

import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.WritableMap
import com.facebook.react.bridge.Arguments
import android.util.Log

class ExpoAssetModule(reactContext: ReactApplicationContext) : ReactContextBaseJavaModule(reactContext) {

    init {
        Log.d("ExpoAssetModule", "ExpoAssetModule créé avec succès !")
    }

    override fun getName(): String {
        Log.d("ExpoAssetModule", "getName() appelé - retourne: ExpoAsset")
        return "ExpoAsset"
    }

    @ReactMethod
    fun downloadAsync(uri: String, promise: Promise) {
        val result = Arguments.createMap()
        result.putString("uri", uri)
        result.putString("localUri", uri)
        promise.resolve(result)
    }

    @ReactMethod
    fun loadAsync(uri: String, promise: Promise) {
        val result = Arguments.createMap()
        result.putString("uri", uri)
        result.putString("localUri", uri)
        promise.resolve(result)
    }

    @ReactMethod
    fun fromModule(moduleId: Int, promise: Promise) {
        val result = Arguments.createMap()
        result.putString("uri", "module://$moduleId")
        result.putString("localUri", "module://$moduleId")
        promise.resolve(result)
    }

    @ReactMethod
    fun fromURI(uri: String, promise: Promise) {
        val result = Arguments.createMap()
        result.putString("uri", uri)
        result.putString("localUri", uri)
        promise.resolve(result)
    }

    @ReactMethod
    fun fromBundle(bundleName: String, promise: Promise) {
        val result = Arguments.createMap()
        result.putString("uri", "bundle://$bundleName")
        result.putString("localUri", "bundle://$bundleName")
        promise.resolve(result)
    }
}
