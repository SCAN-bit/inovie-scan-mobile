package SCAN.mobile

import android.app.Application
import android.content.res.Configuration

import com.facebook.react.ReactApplication
import com.facebook.react.ReactNativeHost
import com.facebook.react.ReactPackage
import com.facebook.react.defaults.DefaultNewArchitectureEntryPoint.load
import com.facebook.react.defaults.DefaultReactNativeHost
import com.facebook.soloader.SoLoader

// DataWedge import (manually added)
import com.darryncampbell.rndatawedgeintents.RNDataWedgeIntentsPackage

class MainApplication : Application(), ReactApplication {

  override val reactNativeHost: ReactNativeHost = object : DefaultReactNativeHost(this) {
    override fun getPackages(): List<ReactPackage> {
      val packages = mutableListOf<ReactPackage>()
      
      // Add DataWedge manually since it's essential for scanning
      packages.add(RNDataWedgeIntentsPackage())
      
      // Note: Other packages will be auto-linked by React Native
      // Firebase, AsyncStorage, NetInfo, etc. are handled automatically
      
      return packages
    }

    override fun getJSMainModuleName(): String = ".expo/.virtual-metro-entry"

    override fun getUseDeveloperSupport(): Boolean = BuildConfig.DEBUG

    override val isNewArchEnabled: Boolean = false
    override val isHermesEnabled: Boolean = false
    
    // Using Android's built-in JavaScript engine - no custom JS executor needed
  }

  override fun onCreate() {
    super.onCreate()
    SoLoader.init(this, false)
    if (BuildConfig.IS_NEW_ARCHITECTURE_ENABLED) {
      // If you opted-in for the New Architecture, we load the native entry point for this app.
      load()
    }
  }

  override fun onConfigurationChanged(newConfig: Configuration) {
    super.onConfigurationChanged(newConfig)
  }
}
