package uk.co.glassinsight.adtechglassapp;

import java.io.BufferedOutputStream;
import java.io.OutputStream;

import lombok.Getter;

public class NamedOS extends BufferedOutputStream {
    @Getter
    private String filename;

    public NamedOS(String filename, OutputStream out) {
        super(out);
        this.filename = filename;
    }
}
