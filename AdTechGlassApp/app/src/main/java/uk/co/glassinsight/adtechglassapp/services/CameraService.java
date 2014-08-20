package uk.co.glassinsight.adtechglassapp.services;

import android.media.MediaCodec;
import android.media.MediaCodecInfo;
import android.media.MediaFormat;
import android.preference.PreferenceManager;
import android.util.Base64;
import android.view.Surface;
import android.view.SurfaceHolder;

import com.coremedia.iso.boxes.Container;
import com.googlecode.mp4parser.FileDataSourceImpl;
import com.googlecode.mp4parser.authoring.Movie;
import com.googlecode.mp4parser.authoring.builder.DefaultMp4Builder;
import com.googlecode.mp4parser.authoring.tracks.AACTrackImpl;
import com.googlecode.mp4parser.authoring.tracks.H264TrackImpl;

import net.majorkernelpanic.streaming.Session;
import net.majorkernelpanic.streaming.SessionBuilder;
import net.majorkernelpanic.streaming.audio.AudioQuality;
import net.majorkernelpanic.streaming.gl.SurfaceView;
import net.majorkernelpanic.streaming.hw.EncoderDebugger;
import net.majorkernelpanic.streaming.rtp.MediaCodecInputStream;
import net.majorkernelpanic.streaming.video.VideoQuality;

import org.apache.commons.io.IOUtils;

import java.io.BufferedOutputStream;
import java.io.File;
import java.io.FileInputStream;
import java.io.FileNotFoundException;
import java.io.FileOutputStream;
import java.io.IOException;
import java.io.InputStream;
import java.io.OutputStream;
import java.lang.reflect.Array;
import java.nio.channels.FileChannel;
import java.util.Arrays;
import java.util.Date;
import java.util.HashMap;
import java.util.Iterator;
import java.util.Map;

import lombok.extern.slf4j.Slf4j;
import uk.co.glassinsight.adtechglassapp.GIH264Stream;
import uk.co.glassinsight.adtechglassapp.GIH264TrackImpl;
import uk.co.glassinsight.adtechglassapp.GIVideoStream;
import uk.co.glassinsight.adtechglassapp.NamedOS;
import uk.co.glassinsight.echoprint.AudioRecorder;

@Slf4j
public class CameraService implements SurfaceHolder.Callback, Runnable {
    private final SurfaceView surfaceView;
    private final GIH264Stream videoStream;

    private static final int BUFFER_LENGTH = 60; // seconds
    private final File PATH;

    private final Thread consumer;
    private volatile boolean isRunning;
    private final Sample[] buffer = new Sample[1024];
    private final byte[] NAL_HEADER = {0, 0, 0, 1};
    private byte[] sps = null;
    private byte[] pps = null;
    private volatile int index = 0;

    private Map<Long, NamedOS> writers = new HashMap<Long, NamedOS>();

    public CameraService(SurfaceView view) {
        PATH = view.getContext().getExternalCacheDir();
        log.info("Camera path: " + PATH.getAbsolutePath());

        surfaceView = view;
        videoStream = new GIH264Stream();
        videoStream.setPreferences(PreferenceManager.getDefaultSharedPreferences(view.getContext()));

        surfaceView.getHolder().addCallback(this);

        consumer = new Thread(this);
    }

    public void save(String tag, long from, long to) throws IOException {
        log.info("Saving " + tag + " AV between " + new Date(from) + " and " + new Date(to));

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

        File filename = new File(PATH, tag + ".h264");
        NamedOS bos = new NamedOS(filename.getAbsolutePath(), new FileOutputStream(filename));

        // Save SPS/PPS
        if (sps != null) {
            bos.write(NAL_HEADER);
            bos.write(sps);
        } else log.error("No SPS");
        if (pps != null) {
            bos.write(NAL_HEADER);
            bos.write(pps);
        } else log.error("No PPS");

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

    public void onSessionStopped() {
        log.info("Camera session stopped");
        try {
            isRunning = false;

        } catch (Exception e) {
            log.error("onSessionStopped", e);
        }
    }

    @Override
    public void surfaceCreated(SurfaceHolder holder) {
        log.info("surfaceCreated");
        try {
            videoStream.setSurfaceView(surfaceView);
            videoStream.startPreview();
            videoStream.configure();
            videoStream.start();
            pps = videoStream.getPPS();
            sps = videoStream.getSPS();
            consumer.start();
        } catch (IOException e) {
            log.error("surfaceCreated", e);
        }
    }

    @Override
    public void surfaceChanged(SurfaceHolder holder, int format, int width, int height) {
    }

    @Override
    public void surfaceDestroyed(SurfaceHolder holder) {
        videoStream.stop();
        onSessionStopped();
    }

    @Override
    public void run() {
        log.info("Consumer running");
        isRunning = true;
        InputStream is = videoStream.getInputStream();
        byte[] buf = new byte[65536];
        try {
            while (isRunning) {
                int read = is.read(buf);
//                log.debug("Consumer read " + read);
                if (read <= 0) continue;
                Sample sample = new Sample(Arrays.copyOf(buf, read), System.currentTimeMillis());
                buffer[index] = sample;
                index = (index+1) % buffer.length;
                Iterator<Map.Entry<Long, NamedOS>> it = writers.entrySet().iterator();
                while (it.hasNext()) {
                    Map.Entry<Long, NamedOS> entry = it.next();
                    Long endTime = entry.getKey();
                    NamedOS bos = entry.getValue();

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
                        log.info("Closed writer after " + new File(bos.getFilename()).length() + "B");
                        Movie m = new Movie();
                        log.info("Movie");
                        m.addTrack(new H264TrackImpl(new FileDataSourceImpl(bos.getFilename())));
                        log.info("h264");
//            m.addTrack(new AACTrackImpl(new FileDataSourceImpl(audioFile)));
//            log.info("aac");

                        Container out = new DefaultMp4Builder().build(m);
                        FileOutputStream fos = new FileOutputStream(bos.getFilename()+".mp4");
                        FileChannel fc = fos.getChannel();
                        out.writeContainer(fc);
                        fos.close();
                        log.info("mp4");
                    }
                }
            }
        } catch (IOException e) {
            log.error("Consumer", e);
        }
        log.info("Consumer stopped");
    }

    private static class Sample {
        public byte[] buffer;
        public long ts;

        public Sample(byte[] buffer, long ts) {
            this.buffer = buffer;
            this.ts = ts;
        }

        public void write(OutputStream os) throws IOException {
            if (buffer.length <= 0) {
                log.error("Zero-length buffer");
                return;
            }
            os.write(buffer);
        }
    }
}
