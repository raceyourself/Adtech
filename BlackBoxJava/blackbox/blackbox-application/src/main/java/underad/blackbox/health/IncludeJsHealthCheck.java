package underad.blackbox.health;

import lombok.AllArgsConstructor;

import com.codahale.metrics.health.HealthCheck;

@AllArgsConstructor
public class IncludeJsHealthCheck extends HealthCheck {
//	private final URI reconstructRelUrl = UriBuilder.fromResource(ReconstructResource.class).build();
	
	@Override
	protected Result check() throws Exception {
		// TODO implement some health checks
		return Result.healthy();
	}
}
