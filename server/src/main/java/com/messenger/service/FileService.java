package com.messenger.service;

import com.messenger.model.File;
import com.messenger.repository.FileRepository;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.util.UUID;

@Service
public class FileService {

    private final FileRepository fileRepository;

    @Value("${file.upload.path:uploads/}")
    private String uploadPath;

    public FileService(FileRepository fileRepository) {
        this.fileRepository = fileRepository;
    }

    /**
     * Save uploaded file and return File entity
     */
    public File saveFile(MultipartFile multipartFile, Long uploadedBy) throws IOException {
        // Create upload directory if it doesn't exist
        Path uploadDir = Paths.get(uploadPath);
        Files.createDirectories(uploadDir);

        // Generate unique filename
        String originalFileName = multipartFile.getOriginalFilename();
        String fileExtension = "";
        if (originalFileName != null && originalFileName.contains(".")) {
            fileExtension = originalFileName.substring(originalFileName.lastIndexOf("."));
        }
        String storedFileName = UUID.randomUUID().toString() + fileExtension;

        // Save file to disk
        Path filePath = uploadDir.resolve(storedFileName);
        Files.write(filePath, multipartFile.getBytes());

        // Create and save file record in database
        File file = new File(
                originalFileName,
                storedFileName,
                multipartFile.getContentType(),
                multipartFile.getSize(),
                "local", // TODO: migrate to MinIO S3 storage
                storedFileName,
                uploadedBy);

        return fileRepository.save(file);
    }

    /**
     * Find file by ID
     */
    public File findById(Long id) {
        return fileRepository.findById(id).orElse(null);
    }
}