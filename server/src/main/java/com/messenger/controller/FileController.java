package com.messenger.controller;

import com.messenger.model.File;
import com.messenger.service.FileService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.core.io.Resource;
import org.springframework.core.io.UrlResource;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.nio.file.Path;
import java.nio.file.Paths;

@RestController
@RequestMapping("/api/files")
public class FileController {

    @Autowired
    private FileService fileService;

    @PostMapping("/upload")
    public ResponseEntity<?> uploadFile(@RequestParam("file") MultipartFile file,
                                       @RequestParam(value = "chatId", required = false) Long chatId,
                                       @RequestParam(value = "uploadedBy", required = false) Long uploadedBy) {
        try {
            // Сохраняем файл
            File savedFile = fileService.saveFile(file, uploadedBy);
            
            // Возвращаем информацию о файле
            return ResponseEntity.ok().body(new UploadResponse(savedFile.getId(), savedFile.getOriginalName(), savedFile.getSize()));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body("Error uploading file: " + e.getMessage());
        }
    }

    @GetMapping("/{fileId}")
    public ResponseEntity<Resource> downloadFile(@PathVariable Long fileId) {
        // Находим файл в базе данных
        com.messenger.model.File file = fileService.findById(fileId);
        
        if (file == null) {
            return ResponseEntity.notFound().build();
        }

        try {
            // Создаем путь к файлу
            Path filePath = Paths.get("uploads").resolve(file.getStoredName()).normalize();
            Resource resource = new UrlResource(filePath.toUri());

            if (resource.exists()) {
                return ResponseEntity.ok()
                        .contentType(MediaType.parseMediaType(file.getContentType()))
                        .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=\"" + file.getOriginalName() + "\"")
                        .body(resource);
            } else {
                return ResponseEntity.notFound().build();
            }
        } catch (Exception e) {
            return ResponseEntity.internalServerError().build();
        }
    }

    // Вспомогательный класс для ответа
    public static class UploadResponse {
        private Long fileId;
        private String fileName;
        private Long fileSize;

        public UploadResponse(Long fileId, String fileName, Long fileSize) {
            this.fileId = fileId;
            this.fileName = fileName;
            this.fileSize = fileSize;
        }

        // Getters
        public Long getFileId() { return fileId; }
        public String getFileName() { return fileName; }
        public Long getFileSize() { return fileSize; }
    }
}