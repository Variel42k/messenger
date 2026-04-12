package com.messenger.storage;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.autoconfigure.condition.ConditionalOnExpression;
import org.springframework.core.io.Resource;
import org.springframework.core.io.UrlResource;
import org.springframework.stereotype.Service;

import java.io.IOException;
import java.io.InputStream;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.nio.file.StandardCopyOption;

@Service
@ConditionalOnExpression("'${storage.provider:disk}' == 'disk' || '${storage.provider:disk}' == 'local'")
public class LocalFileStorage implements FileStorage {

    private final Path uploadDir;

    public LocalFileStorage(@Value("${storage.disk.path:${file.upload.path:uploads/}}") String uploadPath) {
        this.uploadDir = Paths.get(uploadPath).toAbsolutePath().normalize();
    }

    @Override
    public void store(String objectKey, InputStream inputStream, long contentLength, String contentType) throws IOException {
        Files.createDirectories(uploadDir);

        Path targetPath = uploadDir.resolve(objectKey).normalize();
        if (!targetPath.startsWith(uploadDir)) {
            throw new IOException("Invalid file path");
        }

        Files.copy(inputStream, targetPath, StandardCopyOption.REPLACE_EXISTING);
    }

    @Override
    public Resource load(String objectKey) throws IOException {
        Path filePath = uploadDir.resolve(objectKey).normalize();
        if (!filePath.startsWith(uploadDir)) {
            throw new IOException("Invalid file path");
        }

        Resource resource = new UrlResource(filePath.toUri());
        if (!resource.exists() || !resource.isReadable()) {
            return null;
        }
        return resource;
    }

    @Override
    public String bucketName() {
        return "local";
    }
}
