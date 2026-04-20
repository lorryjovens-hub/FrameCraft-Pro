use super::adapter::PPIOModelAdapter;

automod::dir!("src/ai/providers/ppio/models");

pub struct RegisteredPpioModel {
    pub build: fn() -> Box<dyn PPIOModelAdapter>,
}

inventory::collect!(RegisteredPpioModel);

pub fn collect_adapters() -> Vec<Box<dyn PPIOModelAdapter>> {
    inventory::iter::<RegisteredPpioModel>
        .into_iter()
        .map(|entry| (entry.build)())
        .collect()
}
