package com.messenger.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public class CreateChannelMessageRequest {
    @NotBlank
    @Size(max = 20000)
    private String content;

    @Size(max = 120)
    private String clientMsgId;

    public String getContent() { return content; }
    public void setContent(String content) { this.content = content; }

    public String getClientMsgId() { return clientMsgId; }
    public void setClientMsgId(String clientMsgId) { this.clientMsgId = clientMsgId; }
}
