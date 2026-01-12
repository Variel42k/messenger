package com.messenger.service;

import com.messenger.repository.MessageRepository;
import com.messenger.repository.ChatRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.time.ZoneId;
import java.util.Date;

/**
 * Сервис для автоматической очистки устаревших данных
 * Data purge service for automatically cleaning up expired data
 */
@Service
public class DataPurgeService {

    private static final Logger logger = LoggerFactory.getLogger(DataPurgeService.class);

    @Autowired
    private MessageRepository messageRepository;

    @Autowired
    private ChatRepository chatRepository;


    @Value("${app.data-retention-period:30}")
    private int dataRetentionPeriod;

    @Value("${app.automatic-data-purge.enabled:true}")
    private boolean automaticDataPurgeEnabled;

    /**
     * Выполняет автоматическую очистку устаревших данных
     * Performs automatic cleanup of expired data
     */
    @Scheduled(fixedRateString = "${app.purge-frequency:86400000}") // По умолчанию раз в день (86400000 мс)
    public void performAutomaticDataPurge() {
        if (!automaticDataPurgeEnabled) {
            logger.info("Automatic data purge is disabled");
            return;
        }

        logger.info("Starting automatic data purge process...");

        try {
            // Вычисляем дату, до которой удалять данные
            // Calculate the date before which to delete data
            LocalDateTime cutoffDate = LocalDateTime.now().minusDays(dataRetentionPeriod);
            Date cutoffDateAsDate = Date.from(cutoffDate.atZone(ZoneId.systemDefault()).toInstant());

            // Удаляем старые сообщения
            // Delete old messages
            int deletedMessages = messageRepository.deleteByCreatedAtBefore(cutoffDateAsDate);
            logger.info("Deleted {} messages older than {}", deletedMessages, cutoffDate);

            // Удаляем старые файлы, если они связаны с удаленными сообщениями
            // int deletedFiles = fileRepository.deleteOlderThan(cutoffDateAsDate);
            // logger.info("Deleted {} files older than {}", deletedFiles, cutoffDate);

            logger.info("Automatic data purge process completed successfully");

        } catch (Exception e) {
            logger.error("Error during automatic data purge process", e);
        }
    }

    /**
     * Ручной запуск процесса очистки данных
     * Manually trigger the data purge process
     *
     * @param retentionPeriodDays Период хранения данных в днях / Data retention period in days
     * @return Количество удаленных записей / Number of deleted records
     */
    public int manualPurge(int retentionPeriodDays) {
        if (!automaticDataPurgeEnabled) {
            logger.warn("Manual data purge requested but automatic purge is disabled");
            return 0;
        }

        logger.info("Starting manual data purge process with retention period of {} days", retentionPeriodDays);

        try {
            LocalDateTime cutoffDate = LocalDateTime.now().minusDays(retentionPeriodDays);
            Date cutoffDateAsDate = Date.from(cutoffDate.atZone(ZoneId.systemDefault()).toInstant());

            int deletedMessages = messageRepository.deleteByCreatedAtBefore(cutoffDateAsDate);
            logger.info("Manually deleted {} messages older than {}", deletedMessages, cutoffDate);

            // int deletedFiles = fileRepository.deleteOlderThan(cutoffDateAsDate);
            // logger.info("Manually deleted {} files older than {}", deletedFiles, cutoffDate);

            return deletedMessages;

        } catch (Exception e) {
            logger.error("Error during manual data purge process", e);
            throw e;
        }
    }

    public void setAutomaticDataPurgeEnabled(boolean enabled) {
        this.automaticDataPurgeEnabled = enabled;
    }

    public boolean isAutomaticDataPurgeEnabled() {
        return automaticDataPurgeEnabled;
    }

    public void setDataRetentionPeriod(int period) {
        this.dataRetentionPeriod = period;
    }

    public int getDataRetentionPeriod() {
        return dataRetentionPeriod;
    }
}