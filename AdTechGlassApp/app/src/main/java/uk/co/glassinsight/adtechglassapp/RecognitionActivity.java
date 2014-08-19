package uk.co.glassinsight.adtechglassapp;

import android.app.Activity;
import android.os.Bundle;
import android.view.MotionEvent;
import android.view.View;

import com.google.android.glass.touchpad.Gesture;
import com.google.android.glass.touchpad.GestureDetector;

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
        setContentView(R.layout.recognition_main);

        // Glass gestures
        mGestureDetector = new GestureDetector(this).setBaseListener(this);

        // services
        audioFingerprintServiceService = new AudioFingerprintService(this);
        motionService = new MotionService(this);
        cameraService = new CameraService();
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
