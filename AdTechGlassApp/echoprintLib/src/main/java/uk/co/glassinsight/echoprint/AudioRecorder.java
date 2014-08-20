package uk.co.glassinsight.echoprint;


import android.media.AudioFormat;
import android.media.AudioRecord;
import android.media.MediaRecorder;
import android.util.Log;

import java.util.Arrays;

public class AudioRecorder implements Runnable {
    private Thread thread;
    private volatile boolean isRunning = false;

    public static final int FREQUENCY = 11025;
    private static final int CHANNEL = AudioFormat.CHANNEL_IN_MONO;
    private static final int ENCODING = AudioFormat.ENCODING_PCM_16BIT;

    AudioRecord mRecordInstance = null;

    private short audioData[];
    private int bufferSize;

    private int secondsToRecord;

    private final Listener listener;

    public AudioRecorder(Listener listener) {
        this.listener = listener;
    }

    public void start(int secondsToRecord) {
        this.secondsToRecord = secondsToRecord;
        thread = new Thread(this);
        thread.start();
    }

    public void stop() {
        isRunning = false;

        if(mRecordInstance != null)
            mRecordInstance.stop();
    }

    @Override
    public void run() {
        isRunning = true;

        // create the audio buffer
        // get the minimum buffer size
        int minBufferSize = AudioRecord.getMinBufferSize(FREQUENCY, CHANNEL, ENCODING);

        // and the actual buffer size for the audio to record
        // frequency * seconds to record.
        bufferSize = Math.max(minBufferSize, this.FREQUENCY * this.secondsToRecord);

        audioData = new short[bufferSize];

        // start recorder
        mRecordInstance = new AudioRecord(
                MediaRecorder.AudioSource.MIC,
                FREQUENCY, CHANNEL,
                ENCODING, minBufferSize);

        if (listener != null) listener.willStartListening();

        mRecordInstance.startRecording();

        while (isRunning) {

            if (listener != null) listener.willStartListeningPass();

            long started = System.currentTimeMillis();
            long time = System.currentTimeMillis();
            // fill audio buffer with mic data.
            int samplesIn = 0;
            do {
                samplesIn += mRecordInstance.read(audioData, samplesIn, bufferSize - samplesIn);

                if (mRecordInstance.getRecordingState() == AudioRecord.RECORDSTATE_STOPPED)
                    break;
            }
            while (samplesIn < bufferSize);
            Log.d("Fingerprinter", "Audio recorded: " + (System.currentTimeMillis() - time) + " millis");

            if (listener != null) listener.didFinishListeningPass(Arrays.copyOf(audioData, samplesIn), started);
        }

        if(mRecordInstance != null)
        {
            mRecordInstance.stop();
            mRecordInstance.release();
            mRecordInstance = null;
        }

        if (listener != null) listener.didFinishListening();
    }

    public static interface Listener {
        public void willStartListening();
        public void willStartListeningPass();
        public void didFinishListeningPass(short[] audioData, long started);
        public void didFinishListening();
    }
}
