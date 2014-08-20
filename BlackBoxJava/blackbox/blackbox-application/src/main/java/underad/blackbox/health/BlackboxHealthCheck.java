package underad.blackbox.health;

import lombok.AllArgsConstructor;

import com.codahale.metrics.health.HealthCheck;

@AllArgsConstructor
public class BlackboxHealthCheck extends HealthCheck {
	private final String template;
	
	@Override
	protected Result check() throws Exception {
		final String saying = String.format(template, "TEST");
		return saying.contains("TEST") ? Result.healthy() : Result.unhealthy("template doesn't include a name");
	}
}
