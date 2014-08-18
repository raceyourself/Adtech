package com.example.benlister.adtechspikes;

import android.app.Activity;
import android.content.Context;
import android.graphics.Color;
import android.hardware.Sensor;
import android.hardware.SensorEvent;
import android.hardware.SensorEventListener;
import android.hardware.SensorManager;
import android.os.Bundle;
import android.view.Menu;
import android.view.MenuItem;
import android.view.ViewGroup;
import android.widget.TextView;

import java.text.FieldPosition;
import java.text.NumberFormat;
import java.text.ParsePosition;

import lombok.extern.slf4j.Slf4j;

@Slf4j
public class ConcentrationActivity extends Activity implements SensorEventListener {

    private SensorManager sensorManager;
    private Sensor gyro;

    private TextView textView;
    private ViewGroup layout;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        setContentView(R.layout.activity_concentration);

        // UI components
        textView = (TextView)findViewById(R.id.concentrationTextView);
        layout = (ViewGroup)findViewById(R.id.concentrationLayout);

        // sensors
        sensorManager = (SensorManager)getSystemService(SENSOR_SERVICE);
        gyro = sensorManager.getDefaultSensor(Sensor.TYPE_GYROSCOPE);
    }

    protected void onResume() {
        super.onResume();
        sensorManager.registerListener(this, gyro, SensorManager.SENSOR_DELAY_NORMAL);
    }

    protected void onPause() {
        super.onPause();
        sensorManager.unregisterListener(this);
    }


    @Override
    public boolean onCreateOptionsMenu(Menu menu) {
        // Inflate the menu; this adds items to the action bar if it is present.
        getMenuInflater().inflate(R.menu.concentration, menu);
        return true;
    }

    @Override
    public boolean onOptionsItemSelected(MenuItem item) {
        // Handle action bar item clicks here. The action bar will
        // automatically handle clicks on the Home/Up button, so long
        // as you specify a parent activity in AndroidManifest.xml.
        int id = item.getItemId();
        if (id == R.id.action_settings) {
            return true;
        }
        return super.onOptionsItemSelected(item);
    }

    private long lastMovementTime = 0;
    private final long MIN_DISTRACTION_TIME = 1700;  //1.7s to regain focus after last significant head movement
    private final double ROTATION_THRESHOLD = 0.5;
    NumberFormat twoDp = NumberFormat.getNumberInstance();
    @Override
    public void onSensorChanged(SensorEvent event) {
        double modRotation = Math.sqrt(
                Math.pow(event.values[0],2) +
                Math.pow(event.values[0],2) +
                Math.pow(event.values[0],2)
        );
        textView.setText(twoDp.format(modRotation));

        // Red if recent significant movement
        if (modRotation > ROTATION_THRESHOLD) {
            lastMovementTime = System.currentTimeMillis();
            layout.setBackgroundColor(Color.RED);
        }

        // White if no recent significant movement
        if (lastMovementTime + MIN_DISTRACTION_TIME < System.currentTimeMillis()) {
            layout.setBackgroundColor(Color.WHITE);
        }

    }

    @Override
    public void onAccuracyChanged(Sensor sensor, int accuracy) {

    }
}
