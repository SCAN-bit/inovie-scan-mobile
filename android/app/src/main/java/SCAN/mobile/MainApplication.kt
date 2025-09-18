package SCAN.mobile

import android.app.Application
import android.content.res.Configuration

import com.facebook.react.ReactApplication
import com.facebook.react.ReactNativeHost
import com.facebook.react.ReactPackage
import com.facebook.react.defaults.DefaultNewArchitectureEntryPoint.load
import com.facebook.react.defaults.DefaultReactNativeHost
import com.facebook.soloader.SoLoader

// DataWedge imports
import com.darryncampbell.rndatawedgeintents.DataWedgeIntentsPackage

// Firebase imports
import io.invertase.firebase.app.ReactNativeFirebaseAppPackage
import io.invertase.firebase.auth.ReactNativeFirebaseAuthPackage

// React Native Community imports
import com.reactnativecommunity.asyncstorage.AsyncStoragePackage
import com.reactnativecommunity.netinfo.NetInfoPackage
import com.reactnativecommunity.clipboard.ClipboardPackage
import com.reactnativecommunity.datetimepicker.DateTimePickerPackage
import com.reactnativecommunity.picker.PickerPackage

// Gesture Handler imports
import com.swmansion.gesturehandler.RNGestureHandlerPackage

// Safe Area Context imports
import com.th3rdwave.safeareacontext.SafeAreaContextPackage

// Screens imports
import com.swmansion.rnscreens.RNScreensPackage

// File System imports
import com.rnfs.RNFSPackage

class MainApplication : Application(), ReactApplication {

  override val reactNativeHost: ReactNativeHost = object : DefaultReactNativeHost(this) {
    override fun getPackages(): List<ReactPackage> {
      val packages = mutableListOf<ReactPackage>()
      
      // Add packages manually since we're not using Expo PackageList
      
      // DataWedge for scanning
      packages.add(DataWedgeIntentsPackage())
      
      // Firebase
      packages.add(ReactNativeFirebaseAppPackage())
      packages.add(ReactNativeFirebaseAuthPackage())
      
      // AsyncStorage
      packages.add(AsyncStoragePackage())
      
      // NetInfo
      packages.add(NetInfoPackage())
      
      // Clipboard
      packages.add(ClipboardPackage())
      
      // DateTimePicker
      packages.add(DateTimePickerPackage())
      
      // Picker
      packages.add(PickerPackage())
      
      // Gesture Handler
      packages.add(RNGestureHandlerPackage())
      
      // Safe Area Context
      packages.add(SafeAreaContextPackage())
      
      // Screens
      packages.add(RNScreensPackage())
      
      // File System
      packages.add(RNFSPackage())
      
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
    // Expo lifecycle dispatcher removed - using standard React Native
  }

  override fun onConfigurationChanged(newConfig: Configuration) {
    super.onConfigurationChanged(newConfig)
    // Expo lifecycle dispatcher removed - using standard React Native
  }
}
