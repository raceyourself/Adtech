package underad.statistics;

import com.fasterxml.jackson.annotation.JsonProperty;
import lombok.Getter;
import lombok.Setter;
import org.hibernate.validator.constraints.NotEmpty;
import redis.clients.jedis.JedisPoolConfig;

import javax.validation.constraints.Max;
import javax.validation.constraints.Min;
import javax.validation.constraints.NotNull;

public class RedisConfiguration
{
    @NotEmpty
    @JsonProperty
    @Getter
    @Setter
    private String hostname;

    @Min(1)
    @Max(65535)
    @JsonProperty
    @Getter
    @Setter
    private Integer port;

    @NotNull
    @Getter
    @Setter
    private JedisPoolConfig poolConfig = new JedisPoolConfig();

    public int getMaxIdle() {
        return poolConfig.getMaxIdle();
    }

    public void setMaxIdle(int maxIdle) {
        poolConfig.setMaxIdle(maxIdle);
    }

    public int getMinIdle() {
        return poolConfig.getMinIdle();
    }

    public void setMinIdle(int minIdle) {
        poolConfig.setMinIdle(minIdle);
    }

    public long getMaxWaitMillis() {
        return poolConfig.getMaxWaitMillis();
    }

    public void setMaxWaitMillis(long maxWait) {
        poolConfig.setMaxWaitMillis(maxWait);
    }

    public boolean getBlockWhenExhausted() {
        return poolConfig.getBlockWhenExhausted();
    }

    public void setBlockWhenExhausted(boolean blockWhenExhausted) {
        poolConfig.setBlockWhenExhausted(blockWhenExhausted);
    }

    public boolean getTestOnBorrow() {
        return poolConfig.getTestOnBorrow();
    }

    public void setTestOnBorrow(boolean testOnBorrow) {
        poolConfig.setTestOnBorrow(testOnBorrow);
    }

    public boolean getTestOnReturn() {
        return poolConfig.getTestOnReturn();
    }

    public void setTestOnReturn(boolean testOnReturn) {
        poolConfig.setTestOnReturn(testOnReturn);
    }

    public boolean getTestWhileIdle() {
        return poolConfig.getTestWhileIdle();
    }

    public void setTestWhileIdle(boolean testWhileIdle) {
        poolConfig.setTestWhileIdle(testWhileIdle);
    }

    public long getTimeBetweenEvictionRunsMillis() {
        return poolConfig.getTimeBetweenEvictionRunsMillis();
    }

    public void setTimeBetweenEvictionRunsMillis(
            long timeBetweenEvictionRunsMillis) {
        poolConfig.setTimeBetweenEvictionRunsMillis(timeBetweenEvictionRunsMillis);
    }

    public int getNumTestsPerEvictionRun() {
        return poolConfig.getNumTestsPerEvictionRun();
    }

    public void setNumTestsPerEvictionRun(int numTestsPerEvictionRun) {
        poolConfig.setNumTestsPerEvictionRun(numTestsPerEvictionRun);
    }

    public long getMinEvictableIdleTimeMillis() {
        return poolConfig.getMinEvictableIdleTimeMillis();
    }

    public void setMinEvictableIdleTimeMillis(long minEvictableIdleTimeMillis) {
        poolConfig.setMinEvictableIdleTimeMillis(minEvictableIdleTimeMillis);
    }

    public long getSoftMinEvictableIdleTimeMillis() {
        return poolConfig.getSoftMinEvictableIdleTimeMillis();
    }

    public void setSoftMinEvictableIdleTimeMillis(long softMinEvictableIdleTimeMillis) {
        poolConfig.setSoftMinEvictableIdleTimeMillis(softMinEvictableIdleTimeMillis);
    }
}