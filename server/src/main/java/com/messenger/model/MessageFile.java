package com.messenger.model;

import jakarta.persistence.*;

@Entity
@Table(name = "message_files")
public class MessageFile {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "message_id", nullable = false)
    private Long messageId;

    @Column(name = "file_id", nullable = false)
    private Long fileId;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "message_id", insertable = false, updatable = false)
    private Message message;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "file_id", insertable = false, updatable = false)
    private File file;

    // Constructors
    public MessageFile() {}

    public MessageFile(Long messageId, Long fileId) {
        this.messageId = messageId;
        this.fileId = fileId;
    }

    // Getters and Setters
    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    public Long getMessageId() { return messageId; }
    public void setMessageId(Long messageId) { this.messageId = messageId; }

    public Long getFileId() { return fileId; }
    public void setFileId(Long fileId) { this.fileId = fileId; }

    public Message getMessage() { return message; }
    public void setMessage(Message message) { this.message = message; }

    public File getFile() { return file; }
    public void setFile(File file) { this.file = file; }
}