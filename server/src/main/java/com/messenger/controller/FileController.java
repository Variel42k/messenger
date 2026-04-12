package com.messenger.controller;

import com.messenger.model.File;
import com.messenger.model.User;
import com.messenger.model.enums.UserRole;
import com.messenger.service.ChatService;
import com.messenger.service.FileService;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.core.io.Resource;
import org.springframework.http.ContentDisposition;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.util.StringUtils;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import com.messenger.service.UserService;

import java.nio.charset.StandardCharsets;

@RestController
@RequestMapping("/api/files")
public class FileController {

    private static final Logger logger = LoggerFactory.getLogger(FileController.class);

    private final FileService fileService;
    private final UserService userService;
    private final ChatService chatService;

    public FileController(FileService fileService, UserService userService, ChatService chatService) {
        this.fileService = fileService;
        this.userService = userService;
        this.chatService = chatService;
    }

    private User getCurrentUser(UserDetails userDetails) {
        if (userDetails == null) {
            return null;
        }
        return userService.findByUsernameOrEmail(userDetails.getUsername());
    }

    private boolean isAdmin(User user) {
        return user != null && user.getRole() == UserRole.ADMIN;
    }

    @PostMapping("/upload")
    public ResponseEntity<?> uploadFile(@RequestParam("file") MultipartFile file,
            @RequestParam(value = "chatId", required = false) Long chatId,
            @RequestParam(value = "uploadedBy", required = false) Long uploadedBy,
            @AuthenticationPrincipal UserDetails userDetails) {
        try {
            User currentUser = getCurrentUser(userDetails);
            if (currentUser == null) {
                return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
            }

            Long resolvedUploadedBy = currentUser.getId();
            if (uploadedBy != null && !uploadedBy.equals(currentUser.getId())) {
                if (!isAdmin(currentUser)) {
                    return ResponseEntity.status(HttpStatus.FORBIDDEN).build();
                }
                resolvedUploadedBy = uploadedBy;
            }

            if (chatId != null && !isAdmin(currentUser) && !chatService.isUserMember(chatId, resolvedUploadedBy)) {
                return ResponseEntity.status(HttpStatus.FORBIDDEN).build();
            }

            File savedFile = fileService.saveFile(file, resolvedUploadedBy);
            return ResponseEntity.ok()
                    .body(new UploadResponse(savedFile.getId(), savedFile.getOriginalName(), savedFile.getSize()));
        } catch (IllegalArgumentException e) {
            logger.warn("File upload rejected: {}", e.getMessage());
            return ResponseEntity.badRequest().body(e.getMessage());
        } catch (Exception e) {
            logger.error("Error uploading file: {}", e.getMessage());
            return ResponseEntity.internalServerError().body("Failed to upload file");
        }
    }

    @GetMapping("/{fileId}")
    public ResponseEntity<Resource> downloadFile(@PathVariable Long fileId,
            @AuthenticationPrincipal UserDetails userDetails) {
        User currentUser = getCurrentUser(userDetails);
        if (currentUser == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
        }

        File file = fileService.findById(fileId);

        if (file == null) {
            return ResponseEntity.notFound().build();
        }

        boolean admin = isAdmin(currentUser);
        if (!fileService.canUserAccessFile(file, currentUser.getId(), admin)) {
            logger.warn("File access denied: fileId={}, requesterId={}, requesterRole={}, uploadedBy={}",
                    fileId, currentUser.getId(), currentUser.getRole(), file.getUploadedBy());
            return ResponseEntity.status(HttpStatus.FORBIDDEN).build();
        }

        try {
            Resource resource = fileService.loadAsResource(file);
            if (resource == null) {
                return ResponseEntity.notFound().build();
            }

            MediaType mediaType = MediaType.APPLICATION_OCTET_STREAM;
            if (StringUtils.hasText(file.getContentType())) {
                try {
                    mediaType = MediaType.parseMediaType(file.getContentType());
                } catch (Exception ex) {
                    logger.warn("Invalid content type '{}' for file {}", file.getContentType(), fileId);
                }
            }

            String originalFileName = StringUtils.hasText(file.getOriginalName()) ? file.getOriginalName() : "file";
            String safeFileName = originalFileName.replace("\r", "").replace("\n", "");

            ContentDisposition disposition = ContentDisposition.attachment()
                    .filename(safeFileName, StandardCharsets.UTF_8)
                    .build();

            return ResponseEntity.ok()
                    .contentType(mediaType)
                    .header(HttpHeaders.CONTENT_DISPOSITION, disposition.toString())
                    .body(resource);
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
