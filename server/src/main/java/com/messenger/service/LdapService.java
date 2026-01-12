package com.messenger.service;

import com.messenger.dto.LdapSettingsDto;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.stereotype.Service;
import javax.naming.Context;
import javax.naming.directory.DirContext;
import javax.naming.directory.InitialDirContext;
import java.util.Hashtable;

@Service
@ConditionalOnProperty(prefix = "app.ldap", name = "enabled", havingValue = "true")
public class LdapService {

    @Value("${app.ldap.enabled:false}")
    private boolean ldapEnabled;

    @Value("${app.ldap.url:#{null}}")
    private String ldapUrl;

    @Value("${app.ldap.base-dn:#{null}}")
    private String baseDn;

    @Value("${app.ldap.user-dn-pattern:#{null}}")
    private String userDnPattern;

    @Value("${app.ldap.manager-dn:#{null}}")
    private String managerDn;

    @Value("${app.ldap.manager-password:#{null}}")
    private String managerPassword;

    private LdapSettingsDto currentSettings;

    public LdapService() {
        this.currentSettings = new LdapSettingsDto();
    }

    public void saveLdapSettings(LdapSettingsDto settings) {
        // Сохраняем настройки во внутреннее состояние
        this.currentSettings = settings;
        
        // Здесь можно добавить логику сохранения настроек в базу данных или в файл
        updateLdapConfiguration(settings);
    }

    private void updateLdapConfiguration(LdapSettingsDto settings) {
        // Обновляем значения переменных на основе новых настроек
        this.ldapEnabled = settings.isEnabled();
        this.ldapUrl = settings.getUrl();
        this.baseDn = settings.getBaseDn();
        this.userDnPattern = settings.getUserDnPattern();
        this.managerDn = settings.getManagerDn();
        this.managerPassword = settings.getManagerPassword();
    }

    public LdapSettingsDto getCurrentLdapSettings() {
        return new LdapSettingsDto(
            currentSettings.isEnabled(),
            currentSettings.getUrl(),
            currentSettings.getBaseDn(),
            currentSettings.getUserDnPattern(),
            currentSettings.getManagerDn(),
            currentSettings.getManagerPassword()
        );
    }

    public boolean testConnection() {
        if (!ldapEnabled || ldapUrl == null || managerDn == null || managerPassword == null) {
            return false;
        }

        try {
            Hashtable<String, String> env = new Hashtable<>();
            env.put(Context.INITIAL_CONTEXT_FACTORY, "com.sun.jndi.ldap.LdapCtxFactory");
            env.put(Context.PROVIDER_URL, ldapUrl);
            env.put(Context.SECURITY_AUTHENTICATION, "simple");
            env.put(Context.SECURITY_PRINCIPAL, managerDn);
            env.put(Context.SECURITY_CREDENTIALS, managerPassword);

            DirContext ctx = new InitialDirContext(env);
            ctx.close();
            return true;
        } catch (Exception e) {
            return false;
        }
    }

    public boolean authenticateUser(String username, String password) {
        if (!ldapEnabled || ldapUrl == null || baseDn == null) {
            return false;
        }

        try {
            // Формируем DN пользователя в зависимости от настроек
            String userDn;
            if (userDnPattern != null && userDnPattern.contains("{0}")) {
                userDn = userDnPattern.replace("{0}", username);
            } else {
                userDn = "uid=" + username + "," + baseDn;
            }

            Hashtable<String, String> env = new Hashtable<>();
            env.put(Context.INITIAL_CONTEXT_FACTORY, "com.sun.jndi.ldap.LdapCtxFactory");
            env.put(Context.PROVIDER_URL, ldapUrl);
            env.put(Context.SECURITY_AUTHENTICATION, "simple");
            env.put(Context.SECURITY_PRINCIPAL, userDn);
            env.put(Context.SECURITY_CREDENTIALS, password);

            DirContext ctx = new InitialDirContext(env);
            ctx.close();
            return true;
        } catch (Exception e) {
            return false;
        }
    }
}