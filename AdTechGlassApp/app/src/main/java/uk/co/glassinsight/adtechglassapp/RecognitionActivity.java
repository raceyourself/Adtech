package uk.co.glassinsight.adtechglassapp;

import android.app.Activity;
import android.os.Bundle;
import android.provider.Settings;
import android.view.MotionEvent;
import android.view.View;
import android.view.WindowManager;

import com.google.android.glass.touchpad.Gesture;
import com.google.android.glass.touchpad.GestureDetector;

import net.majorkernelpanic.streaming.gl.SurfaceView;

import java.io.IOException;
import java.util.Random;

import lombok.SneakyThrows;
import lombok.extern.slf4j.Slf4j;
import uk.co.glassinsight.adtechglassapp.services.AudioFingerprintService;
import uk.co.glassinsight.adtechglassapp.services.CameraService;
import uk.co.glassinsight.adtechglassapp.services.MotionService;

@Slf4j
public class RecognitionActivity extends Activity implements GestureDetector.BaseListener, AudioFingerprintService.Listener {

    private GestureDetector mGestureDetector;

    private AudioFingerprintService audioFingerprintServiceService;
    private MotionService motionService;
    private CameraService cameraService;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);

        Settings.System.putInt(getContentResolver(), Settings.System.SCREEN_BRIGHTNESS_MODE, Settings.System.SCREEN_BRIGHTNESS_MODE_MANUAL);
        WindowManager.LayoutParams lp = getWindow().getAttributes();
        lp.screenBrightness = 0.00000000000001f;
        getWindow().setAttributes(lp);
        setContentView(R.layout.recognition_main);

        // Glass gestures
        mGestureDetector = new GestureDetector(this).setBaseListener(this);

        // services
        audioFingerprintServiceService = new AudioFingerprintService(this);
        motionService = new MotionService(this);
        cameraService = new CameraService((SurfaceView)findViewById(R.id.surface));
    }

    @Override
    public boolean onGesture(Gesture gesture) {
        if(gesture == Gesture.SWIPE_DOWN){
            // Block swipe down
            return true;
        }
        return false;
    }

    /*
     * Send generic motion events to the gesture detector
     */
    @Override
    public boolean onGenericMotionEvent(MotionEvent event) {
        if (mGestureDetector != null) {
            return mGestureDetector.onMotionEvent(event);
        }
        return false;
    }

    protected void onResume() {
        super.onResume();
        motionService.onResume();
    }

    protected void onPause() {
        super.onPause();
        motionService.onPause();
    }

    @Override
    public void onContentChanged() {
        super.onContentChanged();
        View view = this.findViewById(android.R.id.content);
        view.setKeepScreenOn(true);
    }

    @Override
    public void onMatch(long start, String id, int duration) {
        String tag = id + "-" + start;
        try {
            motionService.save(tag, start, start+duration);
            cameraService.save(tag, start, start+duration);
        } catch (IOException e) {
            log.error("Error saving match", e);
        }
    }
}
