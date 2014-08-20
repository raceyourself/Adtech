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

import java.io.IOException;
import java.io.OutputStream;
import java.net.InetAddress;

/**
 * An interface that represents a Stream. 
 */
public interface GIStream {

	/**
	 * Configures the stream. You need to call this before calling {@link #getSessionDescription()} 
	 * to apply your configuration of the stream.
	 */
	public void configure() throws IllegalStateException, IOException;
	
	/**
	 * Starts the stream.
	 * This method can only be called after {@link uk.co.glassinsight.adtechglassapp.Stream#configure()}.
	 */
	public void start() throws IllegalStateException, IOException;

	/**
	 * Stops the stream.
	 */
	public void stop();
	public boolean isStreaming();

}
