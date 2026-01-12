package com.messenger.dto;

public class LdapSettingsDto {
    private boolean enabled;
    private String url;
    private String baseDn;
    private String userDnPattern;
    private String managerDn;
    private String managerPassword;

    // Constructors
    public LdapSettingsDto() {}

    public LdapSettingsDto(boolean enabled, String url, String baseDn, String userDnPattern, String managerDn, String managerPassword) {
        this.enabled = enabled;
        this.url = url;
        this.baseDn = baseDn;
        this.userDnPattern = userDnPattern;
        this.managerDn = managerDn;
        this.managerPassword = managerPassword;
    }

    // Getters and Setters
    public boolean isEnabled() {
        return enabled;
    }

    public void setEnabled(boolean enabled) {
        this.enabled = enabled;
    }

    public String getUrl() {
        return url;
    }

    public void setUrl(String url) {
        this.url = url;
    }

    public String getBaseDn() {
        return baseDn;
    }

    public void setBaseDn(String baseDn) {
        this.baseDn = baseDn;
    }

    public String getUserDnPattern() {
        return userDnPattern;
    }

    public void setUserDnPattern(String userDnPattern) {
        this.userDnPattern = userDnPattern;
    }

    public String getManagerDn() {
        return managerDn;
    }

    public void setManagerDn(String managerDn) {
        this.managerDn = managerDn;
    }

    public String getManagerPassword() {
        return managerPassword;
    }

    public void setManagerPassword(String managerPassword) {
        this.managerPassword = managerPassword;
    }
}