package com.messenger.service;

import com.messenger.model.File;
import com.messenger.repository.FileRepository;
import com.messenger.repository.MessageFileRepository;
import com.messenger.storage.FileStorage;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.io.Resource;
import org.springframework.stereotype.Service;
import org.springframework.util.StringUtils;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.io.InputStream;
import java.util.Objects;
import java.util.UUID;

@Service
public class FileService {

    private final FileRepository fileRepository;
    private final MessageFileRepository messageFileRepository;
    private final FileStorage fileStorage;

    @Value("${file.upload.max-size-bytes:104857600}")
    private long maxFileSizeBytes;

    public FileService(FileRepository fileRepository, MessageFileRepository messageFileRepository, FileStorage fileStorage) {
        this.fileRepository = fileRepository;
        this.messageFileRepository = messageFileRepository;
        this.fileStorage = fileStorage;
    }

    /**
     * Save uploaded file and return File entity
     */
    public File saveFile(MultipartFile multipartFile, Long uploadedBy) throws IOException {
        if (multipartFile == null || multipartFile.isEmpty()) {
            throw new IllegalArgumentException("File must not be empty");
        }

        if (multipartFile.getSize() > maxFileSizeBytes) {
            throw new IllegalArgumentException("File exceeds the maximum allowed size");
        }

        String originalFileName = sanitizeOriginalFilename(multipartFile.getOriginalFilename());
        String fileExtension = "";
        int extensionStart = originalFileName.lastIndexOf('.');
        if (extensionStart > 0 && extensionStart < originalFileName.length() - 1) {
            String candidateExtension = originalFileName.substring(extensionStart);
            if (candidateExtension.matches("\\.[A-Za-z0-9]{1,10}")) {
                fileExtension = candidateExtension;
            }
        }
        String objectKey = UUID.randomUUID() + fileExtension;

        try (InputStream inputStream = multipartFile.getInputStream()) {
            fileStorage.store(objectKey, inputStream, multipartFile.getSize(), multipartFile.getContentType());
        }

        File file = new File(
                originalFileName,
                objectKey,
                multipartFile.getContentType(),
                multipartFile.getSize(),
                fileStorage.bucketName(),
                objectKey,
                uploadedBy);

        return fileRepository.save(file);
    }

    /**
     * Find file by ID
     */
    public File findById(Long id) {
        return fileRepository.findById(id).orElse(null);
    }

    public Resource loadAsResource(File file) throws IOException {
        return fileStorage.load(file.getObjectKey());
    }

    public boolean canUserAccessFile(Long fileId, Long userId, boolean isAdmin) {
        File file = findById(fileId);
        return canUserAccessFile(file, userId, isAdmin);
    }

    public boolean canUserAccessFile(File file, Long userId, boolean isAdmin) {
        if (isAdmin) {
            return true;
        }

        if (file == null || userId == null) {
            return false;
        }

        if (Objects.equals(file.getUploadedBy(), userId)) {
            return true;
        }

        return messageFileRepository.existsFileInUserChats(file.getId(), userId);
    }

    private String sanitizeOriginalFilename(String originalFilename) {
        String candidate = StringUtils.cleanPath(originalFilename != null ? originalFilename : "file");
        candidate = candidate.replace("\\", "/");
        if (candidate.contains("..")) {
            throw new IllegalArgumentException("Invalid file name");
        }

        String sanitized = candidate.substring(candidate.lastIndexOf('/') + 1)
                .replace("\r", "")
                .replace("\n", "");

        if (!StringUtils.hasText(sanitized)) {
            return "file";
        }

        if (sanitized.length() > 255) {
            return sanitized.substring(0, 255);
        }
        return sanitized;
    }
}
