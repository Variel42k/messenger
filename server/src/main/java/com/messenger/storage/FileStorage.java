package com.messenger.storage;

import org.springframework.core.io.Resource;

import java.io.IOException;
import java.io.InputStream;

public interface FileStorage {
    void store(String objectKey, InputStream inputStream, long contentLength, String contentType) throws IOException;

    Resource load(String objectKey) throws IOException;

    String bucketName();
}
