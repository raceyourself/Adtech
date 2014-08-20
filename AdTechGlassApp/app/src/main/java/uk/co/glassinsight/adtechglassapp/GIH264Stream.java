/*
 * Copyright (C) 2011-2014 GUIGUI Simon, fyhertz@gmail.com
 * 
 * This file is part of libstreaming (https://github.com/fyhertz/libstreaming)
 * 
 * Spydroid is free software; you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation; either version 3 of the License, or
 * (at your option) any later version.
 * 
 * This source code is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU General Public License for more details.
 * 
 * You should have received a copy of the GNU General Public License
 * along with this source code; if not, write to the Free Software
 * Foundation, Inc., 59 Temple Place, Suite 330, Boston, MA  02111-1307  USA
 */

package uk.co.glassinsight.adtechglassapp;

import android.annotation.SuppressLint;
import android.content.SharedPreferences.Editor;
import android.graphics.ImageFormat;
import android.hardware.Camera.CameraInfo;
import android.media.MediaRecorder;
import android.os.Environment;
import android.util.Base64;
import android.util.Log;

import net.majorkernelpanic.streaming.exceptions.ConfNotSupportedException;
import net.majorkernelpanic.streaming.exceptions.StorageUnavailableException;
import net.majorkernelpanic.streaming.hw.EncoderDebugger;
import net.majorkernelpanic.streaming.mp4.MP4Config;
import net.majorkernelpanic.streaming.rtp.H264Packetizer;
import net.majorkernelpanic.streaming.video.VideoStream;

import java.io.File;
import java.io.IOException;
import java.util.concurrent.Semaphore;
import java.util.concurrent.TimeUnit;

public class GIH264Stream extends GIVideoStream {

	public final static String TAG = "GIH264Stream";

	private Semaphore mLock = new Semaphore(0);
	private MP4Config mConfig;

	/**
	 * Constructs the H.264 stream.
	 * Uses CAMERA_FACING_BACK by default.
	 */
	public GIH264Stream() {
		this(CameraInfo.CAMERA_FACING_BACK);
	}

	/**
	 * Constructs the H.264 stream.
	 * @param cameraId Can be either CameraInfo.CAMERA_FACING_BACK or CameraInfo.CAMERA_FACING_FRONT
	 * @throws java.io.IOException
	 */
	public GIH264Stream(int cameraId) {
		super(cameraId);
		mMimeType = "video/avc";
		mCameraImageFormat = ImageFormat.NV21;
		mVideoEncoder = MediaRecorder.VideoEncoder.H264;
	}

	/**
	 * Starts the stream.
	 * This will also open the camera and display the preview if {@link #startPreview()} has not already been called.
	 */
	public synchronized void start() throws IllegalStateException, IOException {
		if (!mStreaming) {
			configure();
			super.start();
		}
	}

	public synchronized void configure() throws IllegalStateException, IOException {
		super.configure();
		mMode = mRequestedMode;
		mQuality = mRequestedQuality.clone();
		mConfig = testH264();
	}

    public byte[] getSPS() {
        return Base64.decode(mConfig.getB64SPS(), Base64.NO_WRAP);
    }

    public byte[] getPPS() {
        return Base64.decode(mConfig.getB64PPS(), Base64.NO_WRAP);
    }

    /**
	 * Tests if streaming with the given configuration (bit rate, frame rate, resolution) is possible 
	 * and determines the pps and sps. Should not be called by the UI thread.
	 **/
	private MP4Config testH264() throws IllegalStateException, IOException {
		if (mMode != MODE_MEDIARECORDER_API) return testMediaCodecAPI();
		else return testMediaRecorderAPI();
	}

	@SuppressLint("NewApi")
	private MP4Config testMediaCodecAPI() throws RuntimeException, IOException {
		createCamera();
		updateCamera();
		try {
			if (mQuality.resX>=640) {
				// Using the MediaCodec API with the buffer method for high resolutions is too slow
				mMode = MODE_MEDIARECORDER_API;
			}
			EncoderDebugger debugger = EncoderDebugger.debug(mSettings, mQuality.resX, mQuality.resY);
			return new MP4Config(debugger.getB64SPS(), debugger.getB64PPS());
		} catch (Exception e) {
			// Fallback on the old streaming method using the MediaRecorder API
			Log.e(TAG,"Resolution not supported with the MediaCodec API, we fallback on the old streamign method.");
			mMode = MODE_MEDIARECORDER_API;
			return testH264();
		}
	}

	// Should not be called by the UI thread
	private MP4Config testMediaRecorderAPI() throws RuntimeException, IOException {
		String key = PREF_PREFIX+"h264-mr-"+mRequestedQuality.framerate+","+mRequestedQuality.resX+","+mRequestedQuality.resY;
	
		if (mSettings != null) {
			if (mSettings.contains(key)) {
				String[] s = mSettings.getString(key, "").split(",");
				return new MP4Config(s[0],s[1],s[2]);
			}
		}
		
		if (!Environment.getExternalStorageState().equals(Environment.MEDIA_MOUNTED)) {
			throw new StorageUnavailableException("No external storage or external storage not ready !");
		}

		final String TESTFILE = Environment.getExternalStorageDirectory().getPath()+"/spydroid-test.mp4";
		
		Log.i(TAG,"Testing H264 support... Test file saved at: "+TESTFILE);

		try {
			File file = new File(TESTFILE);
			file.createNewFile();
		} catch (IOException e) {
			throw new StorageUnavailableException(e.getMessage());
		}
		
		// Save flash state & set it to false so that led remains off while testing h264
		boolean savedFlashState = mFlashEnabled;
		mFlashEnabled = false;

		boolean previewStarted = mPreviewStarted;
		
		boolean cameraOpen = mCamera!=null;
		createCamera();

		// Stops the preview if needed
		if (mPreviewStarted) {
			lockCamera();
			try {
				mCamera.stopPreview();
			} catch (Exception e) {}
			mPreviewStarted = false;
		}

		try {
			Thread.sleep(100);
		} catch (InterruptedException e1) {
			// TODO Auto-generated catch block
			e1.printStackTrace();
		}

		unlockCamera();

		try {
			
			mMediaRecorder = new MediaRecorder();
			mMediaRecorder.setCamera(mCamera);
			mMediaRecorder.setVideoSource(MediaRecorder.VideoSource.CAMERA);
			mMediaRecorder.setOutputFormat(MediaRecorder.OutputFormat.THREE_GPP);
			mMediaRecorder.setVideoEncoder(mVideoEncoder);
			mMediaRecorder.setPreviewDisplay(mSurfaceView.getHolder().getSurface());
			mMediaRecorder.setVideoSize(mRequestedQuality.resX,mRequestedQuality.resY);
			mMediaRecorder.setVideoFrameRate(mRequestedQuality.framerate);
			mMediaRecorder.setVideoEncodingBitRate((int)(mRequestedQuality.bitrate*0.8));
			mMediaRecorder.setOutputFile(TESTFILE);
			mMediaRecorder.setMaxDuration(3000);
			
			// We wait a little and stop recording
			mMediaRecorder.setOnInfoListener(new MediaRecorder.OnInfoListener() {
				public void onInfo(MediaRecorder mr, int what, int extra) {
					Log.d(TAG,"MediaRecorder callback called !");
					if (what==MediaRecorder.MEDIA_RECORDER_INFO_MAX_DURATION_REACHED) {
						Log.d(TAG,"MediaRecorder: MAX_DURATION_REACHED");
					} else if (what==MediaRecorder.MEDIA_RECORDER_INFO_MAX_FILESIZE_REACHED) {
						Log.d(TAG,"MediaRecorder: MAX_FILESIZE_REACHED");
					} else if (what==MediaRecorder.MEDIA_RECORDER_INFO_UNKNOWN) {
						Log.d(TAG,"MediaRecorder: INFO_UNKNOWN");
					} else {
						Log.d(TAG,"WTF ?");
					}
					mLock.release();
				}
			});

			// Start recording
			mMediaRecorder.prepare();
			mMediaRecorder.start();

			if (mLock.tryAcquire(6,TimeUnit.SECONDS)) {
				Log.d(TAG,"MediaRecorder callback was called :)");
				Thread.sleep(400);
			} else {
				Log.d(TAG,"MediaRecorder callback was not called after 6 seconds... :(");
			}
		} catch (IOException e) {
			throw new ConfNotSupportedException(e.getMessage());
		} catch (RuntimeException e) {
			throw new ConfNotSupportedException(e.getMessage());
		} catch (InterruptedException e) {
			e.printStackTrace();
		} finally {
			try {
				mMediaRecorder.stop();
			} catch (Exception e) {}
			mMediaRecorder.release();
			mMediaRecorder = null;
			lockCamera();
			if (!cameraOpen) destroyCamera();
			// Restore flash state
			mFlashEnabled = savedFlashState;
			if (previewStarted) {
				// If the preview was started before the test, we try to restart it.
				try {
					startPreview();
				} catch (Exception e) {}
			}
		}

		// Retrieve SPS & PPS & ProfileId with MP4Config
		MP4Config config = new MP4Config(TESTFILE);

		// Delete dummy video
		File file = new File(TESTFILE);
		if (!file.delete()) Log.e(TAG,"Temp file could not be erased");

		Log.i(TAG,"H264 Test succeded...");

		// Save test result
		if (mSettings != null) {
			Editor editor = mSettings.edit();
			editor.putString(key, config.getProfileLevel()+","+config.getB64SPS()+","+config.getB64PPS());
			editor.commit();
		}

		return config;

	}
	
}
