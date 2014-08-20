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
import android.media.MediaCodec;
import android.media.MediaRecorder;
import android.net.LocalServerSocket;
import android.net.LocalSocket;
import android.net.LocalSocketAddress;
import android.util.Log;

import net.majorkernelpanic.streaming.Stream;
import net.majorkernelpanic.streaming.rtp.AbstractPacketizer;

import java.io.IOException;
import java.io.InputStream;
import java.io.OutputStream;
import java.net.InetAddress;
import java.util.Random;

/**
 * A MediaRecorder that streams what it records using a packetizer from the RTP package.
 * You can't use this class directly !
 */
public abstract class GIMediaStream implements GIStream {

	protected static final String TAG = "GIMediaStream";
	
	/** Raw audio/video will be encoded using the MediaRecorder API. */
	public static final byte MODE_MEDIARECORDER_API = 0x01;

	/** Raw audio/video will be encoded using the MediaCodec API with buffers. */
	public static final byte MODE_MEDIACODEC_API = 0x02;

	/** Raw audio/video will be encoded using the MediaCode API with a surface. */
	public static final byte MODE_MEDIACODEC_API_2 = 0x05;

	/** Prefix that will be used for all shared preferences saved by libstreaming */
	protected static final String PREF_PREFIX = "libstreaming-";

	protected static byte sSuggestedMode = MODE_MEDIARECORDER_API;
	protected byte mMode, mRequestedMode;

	protected boolean mStreaming = false, mConfigured = false;
	protected byte mChannelIdentifier = 0;
	protected InputStream inputStream;
	protected LocalSocket mReceiver, mSender = null;
	private LocalServerSocket mLss = null;
	private int mSocketId, mTTL = 64;

	protected MediaRecorder mMediaRecorder;
	protected MediaCodec mMediaCodec;
	
	static {
		// We determine whether or not the MediaCodec API should be used
		try {
			Class.forName("android.media.MediaCodec");
			// Will be set to MODE_MEDIACODEC_API at some point...
			sSuggestedMode = MODE_MEDIACODEC_API;
			Log.i(TAG,"Phone supports the MediaCoded API");
		} catch (ClassNotFoundException e) {
			sSuggestedMode = MODE_MEDIARECORDER_API;
			Log.i(TAG,"Phone does not support the MediaCodec API");
		}
	}

	public GIMediaStream() {
		mRequestedMode = sSuggestedMode;
		mMode = sSuggestedMode;
	}

	protected void setInputStream(InputStream stream, byte channelIdentifier) {
		inputStream = stream;
		mChannelIdentifier = channelIdentifier;
	}

    public InputStream getInputStream() {
        return inputStream;
    }

	/**
	 * Sets the streaming method that will be used.
	 *
	 * If the mode is set to {@link #MODE_MEDIARECORDER_API}, raw audio/video will be encoded
	 * using the MediaRecorder API. <br />
	 *
	 * If the mode is set to {@link #MODE_MEDIACODEC_API} or to {@link #MODE_MEDIACODEC_API_2},
	 * audio/video will be encoded with using the MediaCodec. <br />
	 *
	 * The {@link #MODE_MEDIACODEC_API_2} mode only concerns {@link net.majorkernelpanic.streaming.video.VideoStream}, it makes
	 * use of the createInputSurface() method of the MediaCodec API (Android 4.3 is needed there). <br />
	 *
	 * @param mode Can be {@link #MODE_MEDIARECORDER_API}, {@link #MODE_MEDIACODEC_API} or {@link #MODE_MEDIACODEC_API_2}
	 */
	public void setStreamingMethod(byte mode) {
		mRequestedMode = mode;
	}

	/**
	 * Returns the streaming method in use, call this after
	 * {@link #configure()} to get an accurate response.
	 */
	public byte getStreamingMethod() {
		return mMode;
	}

	/**
	 * Indicates if the {@link GIMediaStream} is streaming.
	 * @return A boolean indicating if the {@link GIMediaStream} is streaming
	 */
	public boolean isStreaming() {
		return mStreaming;
	}

	/**
	 * Configures the stream with the settings supplied with
	 * {@link net.majorkernelpanic.streaming.video.VideoStream#setVideoQuality(net.majorkernelpanic.streaming.video.VideoQuality)}
	 * for a {@link net.majorkernelpanic.streaming.video.VideoStream} and {@link net.majorkernelpanic.streaming.audio.AudioStream#setAudioQuality(net.majorkernelpanic.streaming.audio.AudioQuality)}
	 * for a {@link net.majorkernelpanic.streaming.audio.AudioStream}.
	 */
	public synchronized void configure() throws IllegalStateException, IOException {
		if (mStreaming) throw new IllegalStateException("Can't be called while streaming.");
		mMode = mRequestedMode;
		mConfigured = true;
	}

	/** Starts the stream. */
	public synchronized void start() throws IllegalStateException, IOException {

		if (mMode != MODE_MEDIARECORDER_API) {
			encodeWithMediaCodec();
		} else {
			encodeWithMediaRecorder();
		}

	}

	/** Stops the stream. */
	@SuppressLint("NewApi")
	public synchronized  void stop() {
		if (mStreaming) {
			try {
				if (mMode==MODE_MEDIARECORDER_API) {
					mMediaRecorder.stop();
					mMediaRecorder.release();
					mMediaRecorder = null;
					closeSockets();
				} else {
					mMediaCodec.stop();
					mMediaCodec.release();
					mMediaCodec = null;
				}
			} catch (Exception e) {
				e.printStackTrace();
			}
			mStreaming = false;
		}
	}

	protected abstract void encodeWithMediaRecorder() throws IOException;

	protected abstract void encodeWithMediaCodec() throws IOException;

	protected void createSockets() throws IOException {

		final String LOCAL_ADDR = "net.majorkernelpanic.streaming-";

		for (int i=0;i<10;i++) {
			try {
				mSocketId = new Random().nextInt();
				mLss = new LocalServerSocket(LOCAL_ADDR+mSocketId);
				break;
			} catch (IOException e1) {}
		}

		mReceiver = new LocalSocket();
		mReceiver.connect( new LocalSocketAddress(LOCAL_ADDR+mSocketId));
		mReceiver.setReceiveBufferSize(500000);
		mReceiver.setSoTimeout(3000);
		mSender = mLss.accept();
		mSender.setSendBufferSize(500000);
	}

	protected void closeSockets() {
		try {
			mReceiver.close();
		} catch (Exception e) {
			e.printStackTrace();
		}
		try {
			mSender.close();
		} catch (Exception e) {
			e.printStackTrace();
		}
		try {
			mLss.close();
		} catch (Exception e) {
			e.printStackTrace();
		}
		mLss = null;
		mSender = null;
		mReceiver = null;
	}
	
}
