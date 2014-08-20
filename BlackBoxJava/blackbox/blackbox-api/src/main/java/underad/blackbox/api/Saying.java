package underad.blackbox.api;

import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;

import org.hibernate.validator.constraints.Length;

import com.fasterxml.jackson.annotation.JsonProperty;

@Getter
@NoArgsConstructor
@AllArgsConstructor
public class Saying {
	@JsonProperty
	private long id;
	
	@JsonProperty
	@Length(max=3)
	private String content;
}
