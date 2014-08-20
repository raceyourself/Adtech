package uk.co.glassinsight.adtechglassapp;

import java.io.BufferedOutputStream;
import java.io.OutputStream;

import lombok.Getter;

public class NamedOutputStream extends BufferedOutputStream {
    @Getter
    private String filename;

    public NamedOutputStream(String filename, OutputStream out) {
        super(out);
        this.filename = filename;
    }
}
