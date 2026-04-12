package com.messenger.service;

import com.messenger.model.File;
import com.messenger.repository.FileRepository;
import com.messenger.repository.MessageFileRepository;
import com.messenger.storage.FileStorage;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.Optional;

import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class FileServiceTest {

    @Mock
    private FileRepository fileRepository;

    @Mock
    private MessageFileRepository messageFileRepository;

    @Mock
    private FileStorage fileStorage;

    private FileService fileService;

    @BeforeEach
    void setUp() {
        fileService = new FileService(fileRepository, messageFileRepository, fileStorage);
    }

    @Test
    void shouldAllowAdminAccess() {
        assertTrue(fileService.canUserAccessFile((File) null, 42L, true));
        verifyNoInteractions(messageFileRepository);
    }

    @Test
    void shouldAllowUploaderAccess() {
        File file = buildFile(10L, 7L);

        assertTrue(fileService.canUserAccessFile(file, 7L, false));
        verifyNoInteractions(messageFileRepository);
    }

    @Test
    void shouldCheckMembershipWhenUserIsNotUploader() {
        File file = buildFile(10L, 7L);
        when(messageFileRepository.existsFileInUserChats(10L, 8L)).thenReturn(true);

        assertTrue(fileService.canUserAccessFile(file, 8L, false));
        verify(messageFileRepository).existsFileInUserChats(10L, 8L);
    }

    @Test
    void shouldDenyWhenUserIdIsNull() {
        File file = buildFile(10L, 7L);

        assertFalse(fileService.canUserAccessFile(file, null, false));
        verifyNoInteractions(messageFileRepository);
    }

    @Test
    void shouldResolveFileByIdAndAllowUploader() {
        File file = buildFile(55L, 9L);
        when(fileRepository.findById(55L)).thenReturn(Optional.of(file));

        assertTrue(fileService.canUserAccessFile(55L, 9L, false));
        verifyNoInteractions(messageFileRepository);
    }

    private File buildFile(Long id, Long uploadedBy) {
        File file = new File();
        file.setId(id);
        file.setUploadedBy(uploadedBy);
        return file;
    }
}

