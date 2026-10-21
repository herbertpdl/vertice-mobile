import { configure } from "@testing-library/react-native";

// Screen tests render whole screens; under a parallel run on a busy machine (or CI) the default
// 1 s for findBy*/waitFor made them flaky. (Runs after the framework is installed: RNTL extends
// `expect` on import, which `setupFiles` can't do.)
configure({ asyncUtilTimeout: 5000 });
