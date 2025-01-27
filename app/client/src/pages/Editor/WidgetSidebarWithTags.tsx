import React, { useContext, useEffect, useMemo, useRef, useState } from "react";
import { useSelector } from "react-redux";
import WidgetCard from "./WidgetCard";
import { getWidgetCards } from "selectors/editorSelectors";
import { ENTITY_EXPLORER_SEARCH_ID } from "constants/Explorer";
import { debounce, sortBy } from "lodash";
import Fuse from "fuse.js";
import type { WidgetCardProps } from "widgets/BaseWidget";
import AnalyticsUtil from "utils/AnalyticsUtil";
import {
  SUGGESTED_WIDGETS_ORDER,
  WIDGET_TAGS,
  type WidgetCardsGroupedByTags,
  type WidgetTags,
} from "constants/WidgetConstants";
import { groupWidgetCardsByTags } from "./utils";
import {
  Collapsible,
  CollapsibleHeader,
  CollapsibleContent,
  SearchInput,
  Text,
} from "design-system";
import WalkthroughContext from "components/featureWalkthrough/walkthroughContext";
import { getIsFirstTimeUserOnboardingEnabled } from "selectors/onboardingSelectors";
import { adaptiveSignpostingEnabled } from "@appsmith/selectors/featureFlagsSelectors";
import {
  actionsExistInCurrentPage,
  widgetsExistCurrentPage,
} from "selectors/entitiesSelector";
import { getFeatureWalkthroughShown } from "utils/storage";
import { FEATURE_WALKTHROUGH_KEYS } from "constants/WalkthroughConstants";
import { SignpostingWalkthroughConfig } from "./FirstTimeUserOnboarding/Utils";

function WidgetSidebarWithTags({ isActive }: { isActive: boolean }) {
  const cards = useSelector(getWidgetCards);
  const groupedCards = useMemo(() => groupWidgetCardsByTags(cards), [cards]);
  const [filteredCards, setFilteredCards] =
    useState<WidgetCardsGroupedByTags>(groupedCards);
  const searchInputRef = useRef<HTMLInputElement | null>(null);
  const [isSearching, setIsSearching] = useState(false);

  const fuse = useMemo(() => {
    const options = {
      keys: [
        {
          name: "displayName",
          weight: 0.8,
        },
        {
          name: "searchTags",
          weight: 0.1,
        },
        {
          name: "tags",
          weight: 0.1,
        },
      ],
      threshold: 0.2,
      distance: 100,
    };

    return new Fuse(cards, options);
  }, [cards]);

  const sendWidgetSearchAnalytics = debounce((value: string) => {
    if (value !== "") {
      AnalyticsUtil.logEvent("WIDGET_SEARCH", { value });
    }
  }, 1000);

  const filterCards = (keyword: string) => {
    setIsSearching(true);
    sendWidgetSearchAnalytics(keyword);

    if (keyword.trim().length > 0) {
      const searchResult = fuse.search(keyword);
      setFilteredCards(groupWidgetCardsByTags(searchResult));
    } else {
      setFilteredCards(groupedCards);
      setIsSearching(false);
    }
  };

  useEffect(() => {
    if (isActive) searchInputRef.current?.focus();
  }, [isActive]);

  const search = debounce((value: string) => {
    filterCards(value.toLowerCase());
  }, 300);

  const { pushFeature } = useContext(WalkthroughContext) || {};
  const signpostingEnabled = useSelector(getIsFirstTimeUserOnboardingEnabled);
  const adaptiveSignposting = useSelector(adaptiveSignpostingEnabled);
  const hasWidgets = useSelector(widgetsExistCurrentPage);
  const actionsExist = useSelector(actionsExistInCurrentPage);
  useEffect(() => {
    if (
      signpostingEnabled &&
      !hasWidgets &&
      actionsExist &&
      adaptiveSignposting &&
      isActive
    ) {
      checkAndShowTableWidgetWalkthrough();
    }
  }, [
    isActive,
    hasWidgets,
    signpostingEnabled,
    adaptiveSignposting,
    actionsExist,
  ]);
  const checkAndShowTableWidgetWalkthrough = async () => {
    const isFeatureWalkthroughShown = await getFeatureWalkthroughShown(
      FEATURE_WALKTHROUGH_KEYS.add_table_widget,
    );
    !isFeatureWalkthroughShown &&
      pushFeature &&
      pushFeature(SignpostingWalkthroughConfig.ADD_TABLE_WIDGET, true);
  };

  return (
    <div
      className={`flex flex-col t--widget-sidebar overflow-hidden ${
        isActive ? "" : "hidden"
      }`}
    >
      <div className="sticky top-0 px-3 mt-0.5">
        <SearchInput
          autoComplete="off"
          autoFocus
          id={ENTITY_EXPLORER_SEARCH_ID}
          onChange={search}
          placeholder="Search widgets"
          ref={searchInputRef}
          type="text"
        />
      </div>
      <div
        className="flex-grow px-3 mt-2 overflow-y-scroll"
        data-testid="widget-sidebar-scrollable-wrapper"
      >
        <div>
          {Object.keys(filteredCards).map((tag) => {
            const cardsForThisTag: WidgetCardProps[] =
              filteredCards[tag as WidgetTags];

            if (!cardsForThisTag?.length) {
              return null;
            }

            // We don't need to show suggested widgets when the user is searching
            if (isSearching && tag === WIDGET_TAGS.SUGGESTED_WIDGETS) {
              return null;
            }

            return (
              <Collapsible
                className={`pb-2 widget-tag-collapisble widget-tag-collapisble-${tag
                  .toLowerCase()
                  .replace(/ /g, "-")}`}
                isOpen
                key={tag}
              >
                <CollapsibleHeader arrowPosition="start">
                  <Text
                    className="select-none"
                    color="var(--ads-v2-color-gray-600)"
                    kind="heading-xs"
                  >
                    {tag}
                  </Text>
                </CollapsibleHeader>

                <CollapsibleContent>
                  <div className="grid items-stretch grid-cols-3 gap-x-2 gap-y-1 justify-items-stretch">
                    {tag === WIDGET_TAGS.SUGGESTED_WIDGETS
                      ? sortBy(cardsForThisTag, (widget) => {
                          return SUGGESTED_WIDGETS_ORDER[widget.type];
                        }).map((card) => (
                          <WidgetCard details={card} key={card.key} />
                        ))
                      : cardsForThisTag.map((card) => (
                          <WidgetCard details={card} key={card.key} />
                        ))}
                  </div>
                </CollapsibleContent>
              </Collapsible>
            );
          })}
        </div>
      </div>
    </div>
  );
}

WidgetSidebarWithTags.displayName = "WidgetSidebarWithTags";

export default WidgetSidebarWithTags;
