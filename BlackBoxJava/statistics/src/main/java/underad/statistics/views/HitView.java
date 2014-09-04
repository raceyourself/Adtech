package underad.statistics.views;

import io.dropwizard.views.View;
import lombok.Getter;
import lombok.Setter;
import lombok.experimental.Accessors;

@Getter
@Setter
@Accessors(fluent = true)
public class HitView extends View {
    private static final String TEMPLATE = "hit.mustache";

    private final String id;

    public HitView(String id) {
        super(TEMPLATE);
        this.id = id;
    }
}
