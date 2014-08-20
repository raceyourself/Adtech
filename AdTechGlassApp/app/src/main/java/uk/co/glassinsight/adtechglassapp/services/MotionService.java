package uk.co.glassinsight.adtechglassapp.services;

import android.content.Context;
import android.graphics.Color;
import android.hardware.Sensor;
import android.hardware.SensorEvent;
import android.hardware.SensorEventListener;
import android.hardware.SensorManager;

import java.io.BufferedOutputStream;
import java.io.File;
import java.io.FileNotFoundException;
import java.io.FileOutputStream;
import java.io.IOException;
import java.io.OutputStream;
import java.lang.reflect.Array;
import java.text.NumberFormat;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.Date;
import java.util.HashMap;
import java.util.Iterator;
import java.util.Map;

import lombok.extern.slf4j.Slf4j;

@Slf4j
public class MotionService implements SensorEventListener {
    private SensorManager sensorManager;
    private Sensor gyro;

    private final Sample[] buffer;
    private volatile int index = 0;

    private static final int BUFFER_LENGTH = 60; // seconds
    private final File PATH;

    private Map<Long, BufferedOutputStream> writers = new HashMap<Long, BufferedOutputStream>();

    public MotionService(Context context) {
        PATH = context.getExternalCacheDir();

        // circular buffer
        int sensorDt = 200; // SENSOR_DELAY_NORMAL should be 5Hz
        int bufferSize = (BUFFER_LENGTH*1000)/sensorDt;
        buffer = new Sample[bufferSize];

        // sensors
        sensorManager = (SensorManager)context.getSystemService(Context.SENSOR_SERVICE);
        gyro = sensorManager.getDefaultSensor(Sensor.TYPE_GYROSCOPE);
    }

    public void onPause() {
        sensorManager.unregisterListener(this);
    }

    public void onResume() {
        sensorManager.registerListener(this, gyro, SensorManager.SENSOR_DELAY_NORMAL);
    }

    private long lastMovementTime = 0;
    private final long MIN_DISTRACTION_TIME = 1700;  //1.7s to regain focus after last significant head movement
    private final double ROTATION_THRESHOLD = 0.5;
    NumberFormat twoDp = NumberFormat.getNumberInstance();
    @Override
    public void onSensorChanged(SensorEvent event) {
        double modRotation = Math.sqrt(
                Math.pow(event.values[0],2) +
                        Math.pow(event.values[1],2) +
                        Math.pow(event.values[2],2)
        );
//        textView.setText(twoDp.format(modRotation));

        // Red if recent significant movement
        if (modRotation > ROTATION_THRESHOLD) {
            lastMovementTime = System.currentTimeMillis();
//            layout.setBackgroundColor(Color.RED);
        }

        // White if no recent significant movement
        if (lastMovementTime + MIN_DISTRACTION_TIME < System.currentTimeMillis()) {
//            layout.setBackgroundColor(Color.WHITE);
        }

        Sample sample = new Sample(event.values[0], event.values[1], event.values[2], System.currentTimeMillis());
        buffer[index] = sample;
        index = (index + 1) % buffer.length;
        Iterator<Map.Entry<Long, BufferedOutputStream>> it = writers.entrySet().iterator();
        while (it.hasNext()) {
            Map.Entry<Long, BufferedOutputStream> entry = it.next();
            Long endTime = entry.getKey();
            BufferedOutputStream bos = entry.getValue();

            // Write sample
            try {
                sample.write(bos);
            } catch (IOException e) {
                log.error("Write error", e);
                it.remove();
                try {
                    bos.close();
                } catch (IOException ex) {
                    log.error("Error closing writer", ex);
                }
            }

            // Remove writer if done
            if (endTime <= sample.ts) {
                it.remove();
                try {
                    bos.close();
                } catch (IOException e) {
                    log.error("Error closing writer", e);
                }
                log.info("Closed writer");
            }
        }
    }

    @Override
    public void onAccuracyChanged(Sensor sensor, int accuracy) {
    }

    public void save(String tag, long from, long to) throws IOException {
        log.info("Saving " + tag + " motion between " + new Date(from) + " and " + new Date(to));

        // Save historical video between from..now to disk
        int now = index; // Next index
        Sample[] history = Arrays.copyOf(buffer, buffer.length);
        int latest = (now-1+history.length) % history.length; // Latest write

        Integer start = null;
        // Loop backwards until before from or buffer has wrapped
        for (int i=latest; i != now; i = (i-1+history.length) % history.length) {
            if (history[i] == null) break;
            if (history[i].ts <= from) {
                start = i;
                break;
            }
            start = i;
        }

        BufferedOutputStream bos = new BufferedOutputStream(new FileOutputStream(new File(PATH, tag + ".motion")));

        if (start != null) {
            // Save between [start, now) to disk
            for (int i=start; i != now; i = (i+1) % history.length) history[i].write(bos);
        }

        // Save recording video between now..to to disk
        synchronized (buffer) {
            // Have concurrent writes occurred?
            if (now != index) {
                // Save between [old now, current now) to disk
                for (int i=now; i != index; i = (i+1) % buffer.length) buffer[i].write(bos);
            }
            // Add BOS to writer queue
            log.info("Adding writer for " + tag + " to queue");
            writers.put(to, bos);
        }
    }

    private static class Sample {
        public float x, y, z;
        public long ts;

        public Sample(float x, float y, float z, long ts) {
            this.x = x;
            this.y = y;
            this.z = z;
            this.ts = ts;
        }

        public void write(OutputStream os) throws IOException {
            os.write(new String(x + "," + y + "," + z + "\n").getBytes());
        }
    }
}
