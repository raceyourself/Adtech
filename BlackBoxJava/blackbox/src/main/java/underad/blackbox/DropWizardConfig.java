package underad.blackbox;

import org.hibernate.validator.constraints.NotEmpty;

import com.fasterxml.jackson.annotation.JsonProperty;

import io.dropwizard.Configuration;

@Data
public class DropWizardConfig extends Configuration {
	@NotEmpty
	@JsonProperty
	private String template;
	@NotEmpty
	@JsonProperty
	private String defaultName = "Stranger";
	
}
