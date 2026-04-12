package com.messenger.storage;

import jakarta.annotation.PreDestroy;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.core.io.InputStreamResource;
import org.springframework.core.io.Resource;
import org.springframework.stereotype.Service;
import org.springframework.util.StringUtils;
import software.amazon.awssdk.auth.credentials.AwsBasicCredentials;
import software.amazon.awssdk.auth.credentials.StaticCredentialsProvider;
import software.amazon.awssdk.core.exception.SdkClientException;
import software.amazon.awssdk.core.ResponseInputStream;
import software.amazon.awssdk.core.sync.RequestBody;
import software.amazon.awssdk.regions.Region;
import software.amazon.awssdk.services.s3.S3Client;
import software.amazon.awssdk.services.s3.S3ClientBuilder;
import software.amazon.awssdk.services.s3.S3Configuration;
import software.amazon.awssdk.services.s3.model.CreateBucketRequest;
import software.amazon.awssdk.services.s3.model.GetObjectRequest;
import software.amazon.awssdk.services.s3.model.GetObjectResponse;
import software.amazon.awssdk.services.s3.model.HeadBucketRequest;
import software.amazon.awssdk.services.s3.model.NoSuchBucketException;
import software.amazon.awssdk.services.s3.model.NoSuchKeyException;
import software.amazon.awssdk.services.s3.model.PutObjectRequest;
import software.amazon.awssdk.services.s3.model.S3Exception;

import java.io.IOException;
import java.io.InputStream;
import java.net.URI;

@Service
@ConditionalOnProperty(name = "storage.provider", havingValue = "s3")
public class S3FileStorage implements FileStorage {

    private static final Logger logger = LoggerFactory.getLogger(S3FileStorage.class);

    private final S3Client s3Client;
    private final String bucketName;
    private final boolean autoCreateBucket;

    public S3FileStorage(
            @Value("${s3.endpoint:}") String endpoint,
            @Value("${s3.access-key}") String accessKey,
            @Value("${s3.secret-key}") String secretKey,
            @Value("${s3.bucket-name}") String bucketName,
            @Value("${s3.region:us-east-1}") String region,
            @Value("${s3.path-style-access-enabled:true}") boolean pathStyleAccessEnabled,
            @Value("${s3.auto-create-bucket:true}") boolean autoCreateBucket) {
        S3ClientBuilder builder = S3Client.builder()
                .region(Region.of(region))
                .credentialsProvider(StaticCredentialsProvider.create(AwsBasicCredentials.create(accessKey, secretKey)))
                .serviceConfiguration(S3Configuration.builder()
                        .pathStyleAccessEnabled(pathStyleAccessEnabled)
                        .build());

        if (StringUtils.hasText(endpoint)) {
            builder.endpointOverride(URI.create(endpoint));
        }

        this.s3Client = builder.build();
        this.bucketName = bucketName;
        this.autoCreateBucket = autoCreateBucket;
        ensureBucketExists();
    }

    @Override
    public void store(String objectKey, InputStream inputStream, long contentLength, String contentType) throws IOException {
        try {
            PutObjectRequest.Builder requestBuilder = PutObjectRequest.builder()
                    .bucket(bucketName)
                    .key(objectKey);

            if (StringUtils.hasText(contentType)) {
                requestBuilder.contentType(contentType);
            }

            s3Client.putObject(requestBuilder.build(), RequestBody.fromInputStream(inputStream, contentLength));
        } catch (S3Exception ex) {
            throw new IOException("Failed to upload object to S3", ex);
        }
    }

    @Override
    public Resource load(String objectKey) throws IOException {
        try {
            ResponseInputStream<GetObjectResponse> stream = s3Client.getObject(
                    GetObjectRequest.builder()
                            .bucket(bucketName)
                            .key(objectKey)
                            .build());
            Long objectSize = stream.response().contentLength();

            return new InputStreamResource(stream) {
                @Override
                public String getFilename() {
                    return objectKey;
                }

                @Override
                public long contentLength() {
                    return objectSize != null ? objectSize : -1L;
                }
            };
        } catch (NoSuchKeyException ex) {
            return null;
        } catch (S3Exception ex) {
            if (ex.statusCode() == 404) {
                return null;
            }
            throw new IOException("Failed to download object from S3", ex);
        }
    }

    @Override
    public String bucketName() {
        return bucketName;
    }

    private void ensureBucketExists() {
        int maxAttempts = 15;
        for (int attempt = 1; attempt <= maxAttempts; attempt++) {
            try {
                s3Client.headBucket(HeadBucketRequest.builder().bucket(bucketName).build());
                return;
            } catch (NoSuchBucketException ex) {
                createBucketIfAllowed();
                return;
            } catch (S3Exception ex) {
                if (ex.statusCode() == 404) {
                    createBucketIfAllowed();
                    return;
                }
                if (attempt == maxAttempts) {
                    throw ex;
                }
                waitBeforeRetry(attempt, ex);
            } catch (SdkClientException ex) {
                if (attempt == maxAttempts) {
                    throw ex;
                }
                waitBeforeRetry(attempt, ex);
            }
        }
    }

    private void createBucketIfAllowed() {
        if (!autoCreateBucket) {
            throw new IllegalStateException("S3 bucket does not exist: " + bucketName);
        }

        logger.info("S3 bucket '{}' does not exist. Creating automatically.", bucketName);
        try {
            s3Client.createBucket(CreateBucketRequest.builder().bucket(bucketName).build());
        } catch (S3Exception ex) {
            if (ex.statusCode() != 409) {
                throw ex;
            }
        }
    }

    private void waitBeforeRetry(int attempt, RuntimeException ex) {
        logger.warn("S3 is not ready yet (attempt {}/15): {}", attempt, ex.getMessage());
        try {
            Thread.sleep(1500);
        } catch (InterruptedException interruptedException) {
            Thread.currentThread().interrupt();
            throw new IllegalStateException("Interrupted while waiting for S3 availability", interruptedException);
        }
    }

    @PreDestroy
    public void close() {
        s3Client.close();
    }
}
