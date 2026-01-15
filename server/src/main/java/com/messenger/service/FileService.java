package com.messenger.service;

import com.messenger.model.File;
import com.messenger.repository.FileRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.time.LocalDateTime;
import java.util.UUID;

@Service
public class FileService {

    @Autowired
    private FileRepository fileRepository;

    @Value("${file.upload.path:uploads/}")
    private String uploadPath;

    /**
     * Сохраняет загруженный файл и возвращает объект File
     */
    public File saveFile(MultipartFile multipartFile, Long uploadedBy) throws IOException {
        // Создаем директорию для загрузки, если она не существует
        Path uploadDir = Paths.get(uploadPath);
        Files.createDirectories(uploadDir);

        // Генерируем уникальное имя файла
        String originalFileName = multipartFile.getOriginalFilename();
        String fileExtension = "";
        if (originalFileName != null && originalFileName.contains(".")) {
            fileExtension = originalFileName.substring(originalFileName.lastIndexOf("."));
        }
        String storedFileName = UUID.randomUUID().toString() + fileExtension;
        
        // Сохраняем файл на диск
        Path filePath = uploadDir.resolve(storedFileName);
        Files.write(filePath, multipartFile.getBytes());

        // Создаем и сохраняем запись о файле в базе данных
        File file = new File(
            originalFileName,
            storedFileName,
            multipartFile.getContentType(),
            multipartFile.getSize(),
            "local", // для простоты используем локальное хранилище
            storedFileName,
            uploadedBy
        );

        return fileRepository.save(file);
    }

    /**
     * Находит файл по ID
     */
    public File findById(Long id) {
        return fileRepository.findById(id).orElse(null);
    }
}