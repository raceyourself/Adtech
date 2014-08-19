package uk.co.glassinsight.adtechglassapp.services;

import java.io.IOException;

import lombok.extern.slf4j.Slf4j;

@Slf4j
public class CameraService {

    public CameraService() {
    }

    public void save(String tag, long from, long to) throws IOException {
        // Save historical video between from..now to disk
        // Save recording video between now..to to disk
    }
}
