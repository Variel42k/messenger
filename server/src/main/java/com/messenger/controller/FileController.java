package com.messenger.controller;

import com.messenger.model.File;
import com.messenger.service.FileService;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.io.Resource;
import org.springframework.core.io.UrlResource;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.nio.file.Path;
import java.nio.file.Paths;

@RestController
@RequestMapping("/api/files")
public class FileController {

    private static final Logger logger = LoggerFactory.getLogger(FileController.class);

    private final FileService fileService;
    private final Path uploadDir;

    public FileController(FileService fileService,
            @Value("${file.upload.path:uploads/}") String uploadPath) {
        this.fileService = fileService;
        this.uploadDir = Paths.get(uploadPath).toAbsolutePath().normalize();
    }

    @PostMapping("/upload")
    public ResponseEntity<?> uploadFile(@RequestParam("file") MultipartFile file,
            @RequestParam(value = "chatId", required = false) Long chatId,
            @RequestParam(value = "uploadedBy", required = false) Long uploadedBy) {
        try {
            File savedFile = fileService.saveFile(file, uploadedBy);
            return ResponseEntity.ok()
                    .body(new UploadResponse(savedFile.getId(), savedFile.getOriginalName(), savedFile.getSize()));
        } catch (Exception e) {
            logger.error("Error uploading file: {}", e.getMessage());
            return ResponseEntity.badRequest().body("Error uploading file: " + e.getMessage());
        }
    }

    @GetMapping("/{fileId}")
    public ResponseEntity<Resource> downloadFile(@PathVariable Long fileId) {
        File file = fileService.findById(fileId);

        if (file == null) {
            return ResponseEntity.notFound().build();
        }

        try {
            // Path Traversal protection: resolve and verify the path stays within uploadDir
            Path filePath = uploadDir.resolve(file.getStoredName()).normalize();
            if (!filePath.startsWith(uploadDir)) {
                logger.warn("Path traversal attempt detected for file: {}", file.getStoredName());
                return ResponseEntity.badRequest().build();
            }

            Resource resource = new UrlResource(filePath.toUri());

            if (resource.exists()) {
                return ResponseEntity.ok()
                        .contentType(MediaType.parseMediaType(file.getContentType()))
                        .header(HttpHeaders.CONTENT_DISPOSITION,
                                "attachment; filename=\"" + file.getOriginalName() + "\"")
                        .body(resource);
            } else {
                return ResponseEntity.notFound().build();
            }
        } catch (Exception e) {
            logger.error("Error downloading file {}: {}", fileId, e.getMessage());
            return ResponseEntity.internalServerError().build();
        }
    }

    // Upload response DTO
    public static class UploadResponse {
        private Long fileId;
        private String fileName;
        private Long fileSize;

        public UploadResponse(Long fileId, String fileName, Long fileSize) {
            this.fileId = fileId;
            this.fileName = fileName;
            this.fileSize = fileSize;
        }

        public Long getFileId() {
            return fileId;
        }

        public String getFileName() {
            return fileName;
        }

        public Long getFileSize() {
            return fileSize;
        }
    }
}