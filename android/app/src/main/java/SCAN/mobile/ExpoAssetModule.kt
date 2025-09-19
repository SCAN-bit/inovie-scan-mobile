package SCAN.mobile

import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.WritableMap
import com.facebook.react.bridge.Arguments

class ExpoAssetModule(reactContext: ReactApplicationContext) : ReactContextBaseJavaModule(reactContext) {

    override fun getName(): String {
        return "ExpoAsset"
    }

    @ReactMethod
    fun downloadAsync(uri: String, promise: Promise) {
        // Polyfill simple - retourner un succès
        val result = Arguments.createMap()
        result.putString("uri", uri)
        result.putString("localUri", uri)
        promise.resolve(result)
    }

    @ReactMethod
    fun loadAsync(uri: String, promise: Promise) {
        // Polyfill simple - retourner un succès
        val result = Arguments.createMap()
        result.putString("uri", uri)
        result.putString("localUri", uri)
        promise.resolve(result)
    }

    @ReactMethod
    fun fromModule(moduleId: Int, promise: Promise) {
        // Polyfill simple - retourner un succès
        val result = Arguments.createMap()
        result.putString("uri", "module://$moduleId")
        result.putString("localUri", "module://$moduleId")
        promise.resolve(result)
    }

    @ReactMethod
    fun fromURI(uri: String, promise: Promise) {
        // Polyfill simple - retourner un succès
        val result = Arguments.createMap()
        result.putString("uri", uri)
        result.putString("localUri", uri)
        promise.resolve(result)
    }

    @ReactMethod
    fun fromBundle(bundleName: String, promise: Promise) {
        // Polyfill simple - retourner un succès
        val result = Arguments.createMap()
        result.putString("uri", "bundle://$bundleName")
        result.putString("localUri", "bundle://$bundleName")
        promise.resolve(result)
    }
}
